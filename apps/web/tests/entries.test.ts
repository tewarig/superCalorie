import { beforeAll, describe, expect, it } from "vitest";
import { DELETE as deleteEntry } from "@/app/api/entries/[id]/route";
import { GET as getDay, POST as logEntry } from "@/app/api/entries/route";
import { GET as searchFoods } from "@/app/api/foods/route";
import { createAccount, getRequest, jsonRequest } from "./helpers";

/** Banana: 105 kcal, P1 C27 F0 per `1 medium` — see src/lib/foods-seed.ts. */
let bananaId: string;
let token: string;

beforeAll(async () => {
  ({ token } = await createAccount("entries@example.com"));
  const response = await searchFoods(getRequest("/api/foods?q=Banana", token));
  const { foods } = await response.json();
  bananaId = foods[0].id;
});

describe("POST /api/entries", () => {
  it("scales the library macros by quantity and denormalises them onto the entry", async () => {
    const response = await logEntry(
      jsonRequest(
        "POST",
        "/api/entries",
        { foodId: bananaId, quantity: 2, meal: "breakfast", date: "2026-03-01" },
        token,
      ),
    );
    const { entry } = await response.json();

    expect(response.status).toBe(201);
    expect(entry).toMatchObject({
      name: "Banana",
      quantity: 2,
      servingLabel: "1 medium",
      calories: 210,
      protein: 2,
      carbs: 54,
      fat: 0,
      meal: "breakfast",
      date: "2026-03-01",
    });
  });

  it("accepts a free-text custom entry", async () => {
    const response = await logEntry(
      jsonRequest(
        "POST",
        "/api/entries",
        { name: "  Grandma's biryani  ", calories: 640, protein: 25, meal: "dinner", date: "2026-03-02" },
        token,
      ),
    );
    const { entry } = await response.json();

    expect(response.status).toBe(201);
    expect(entry.name).toBe("Grandma's biryani");
    expect(entry.calories).toBe(640);
    expect(entry.protein).toBe(25);
    // Unsupplied macros default to zero rather than NaN.
    expect(entry.carbs).toBe(0);
    expect(entry.fat).toBe(0);
  });

  it("defaults an unknown meal to snack", async () => {
    const response = await logEntry(
      jsonRequest(
        "POST",
        "/api/entries",
        { foodId: bananaId, meal: "brunch", date: "2026-03-03" },
        token,
      ),
    );
    expect((await response.json()).entry.meal).toBe("snack");
  });

  it("404s on an unknown foodId", async () => {
    const response = await logEntry(
      jsonRequest("POST", "/api/entries", { foodId: "does-not-exist", meal: "snack" }, token),
    );
    expect(response.status).toBe(404);
  });

  it.each([0, -1, 51, "abc"])("rejects quantity %s", async (quantity) => {
    const response = await logEntry(
      jsonRequest("POST", "/api/entries", { foodId: bananaId, quantity, meal: "snack" }, token),
    );
    expect(response.status).toBe(400);
  });

  it.each([
    ["missing name", { calories: 100 }],
    ["negative calories", { name: "Mystery", calories: -1 }],
    ["calories over the cap", { name: "Mystery", calories: 10001 }],
    ["missing calories", { name: "Mystery" }],
  ])("rejects a custom entry with %s", async (_label, body) => {
    const response = await logEntry(
      jsonRequest("POST", "/api/entries", { ...body, meal: "snack" }, token),
    );
    expect(response.status).toBe(400);
  });

  it("401s without credentials", async () => {
    const response = await logEntry(
      jsonRequest("POST", "/api/entries", { foodId: bananaId, meal: "snack" }),
    );
    expect(response.status).toBe(401);
  });
});

describe("GET /api/entries", () => {
  it("returns one day's entries with totals and remaining", async () => {
    const { token: fresh } = await createAccount("day@example.com");
    await logEntry(
      jsonRequest(
        "POST",
        "/api/entries",
        { foodId: bananaId, quantity: 2, meal: "breakfast", date: "2026-04-01" },
        fresh,
      ),
    );
    await logEntry(
      jsonRequest(
        "POST",
        "/api/entries",
        { name: "Coffee", calories: 40, fat: 2, meal: "breakfast", date: "2026-04-01" },
        fresh,
      ),
    );

    const response = await getDay(getRequest("/api/entries?date=2026-04-01", fresh));
    const day = await response.json();

    expect(day.date).toBe("2026-04-01");
    expect(day.entries).toHaveLength(2);
    expect(day.totals).toEqual({ calories: 250, protein: 2, carbs: 54, fat: 2 });
    expect(day.goal).toBe(2000);
    expect(day.remaining).toBe(1750);
  });

  it("scopes entries to the requested day", async () => {
    const response = await getDay(getRequest("/api/entries?date=2026-04-02", token));
    expect((await response.json()).entries).toHaveLength(0);
  });

  it("never reports negative remaining once you go over goal", async () => {
    const { token: heavy } = await createAccount("over@example.com");
    for (let i = 0; i < 4; i += 1) {
      await logEntry(
        jsonRequest(
          "POST",
          "/api/entries",
          { name: "Feast", calories: 900, meal: "dinner", date: "2026-05-01" },
          heavy,
        ),
      );
    }

    const day = await (await getDay(getRequest("/api/entries?date=2026-05-01", heavy))).json();
    expect(day.totals.calories).toBe(3600);
    expect(day.remaining).toBe(0);
  });
});

describe("DELETE /api/entries/:id", () => {
  it("removes the caller's own entry", async () => {
    const created = await (
      await logEntry(
        jsonRequest(
          "POST",
          "/api/entries",
          { foodId: bananaId, meal: "snack", date: "2026-06-01" },
          token,
        ),
      )
    ).json();

    const response = await deleteEntry(jsonRequest("DELETE", "/api/entries", undefined, token), {
      params: Promise.resolve({ id: created.entry.id }),
    });
    expect(response.status).toBe(200);

    const day = await (await getDay(getRequest("/api/entries?date=2026-06-01", token))).json();
    expect(day.entries).toHaveLength(0);
  });

  it("will not let one user delete another user's entry", async () => {
    const { token: attacker } = await createAccount("attacker@example.com");
    const created = await (
      await logEntry(
        jsonRequest(
          "POST",
          "/api/entries",
          { foodId: bananaId, meal: "snack", date: "2026-07-01" },
          token,
        ),
      )
    ).json();

    const response = await deleteEntry(jsonRequest("DELETE", "/api/entries", undefined, attacker), {
      params: Promise.resolve({ id: created.entry.id }),
    });
    expect(response.status).toBe(404);

    // Still there for the rightful owner.
    const day = await (await getDay(getRequest("/api/entries?date=2026-07-01", token))).json();
    expect(day.entries).toHaveLength(1);
  });
});
