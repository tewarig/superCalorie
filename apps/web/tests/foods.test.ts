import { describe, expect, it } from "vitest";
import { POST as logEntry } from "@/app/api/entries/route";
import { GET as searchFoods } from "@/app/api/foods/route";
import { createAccount, getRequest, jsonRequest } from "./helpers";

describe("GET /api/foods", () => {
  it("ranks prefix matches above mid-string matches", async () => {
    const { token } = await createAccount("search@example.com");
    const { foods, source } = await (
      await searchFoods(getRequest("/api/foods?q=chicken", token))
    ).json();

    expect(source).toBe("search");
    expect(foods.length).toBeGreaterThan(1);
    // "Chicken tikka" and friends before "Butter chicken".
    expect(foods[0].name.toLowerCase().startsWith("chicken")).toBe(true);
    expect(foods.at(-1).name).toBe("Butter chicken");
  });

  it("is case-insensitive and returns whole serving macros", async () => {
    const { token } = await createAccount("search2@example.com");
    const { foods } = await (await searchFoods(getRequest("/api/foods?q=BANANA", token))).json();

    expect(foods[0]).toMatchObject({
      name: "Banana",
      servingLabel: "1 medium",
      calories: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
    });
  });

  it("returns an empty list for a query that matches nothing", async () => {
    const { token } = await createAccount("search3@example.com");
    const { foods } = await (
      await searchFoods(getRequest("/api/foods?q=zzzznotafood", token))
    ).json();
    expect(foods).toEqual([]);
  });

  it("falls back to starter foods for a brand-new account", async () => {
    const { token } = await createAccount("fresh@example.com");
    const { foods, source } = await (await searchFoods(getRequest("/api/foods", token))).json();

    expect(source).toBe("recent");
    expect(foods.length).toBeGreaterThan(0);
  });

  it("surfaces the user's most-logged food first once they have history", async () => {
    const { token } = await createAccount("usuals@example.com");
    const { foods } = await (await searchFoods(getRequest("/api/foods?q=Idli", token))).json();
    const idli = foods[0];

    // Log it three times — more than anything else this account has.
    for (let i = 0; i < 3; i += 1) {
      await logEntry(
        jsonRequest(
          "POST",
          "/api/entries",
          { foodId: idli.id, meal: "breakfast", date: `2026-08-0${i + 1}` },
          token,
        ),
      );
    }

    const { foods: usuals } = await (await searchFoods(getRequest("/api/foods", token))).json();
    expect(usuals[0].name).toBe("Idli");
  });

  it("401s without credentials", async () => {
    expect((await searchFoods(getRequest("/api/foods"))).status).toBe(401);
  });
});
