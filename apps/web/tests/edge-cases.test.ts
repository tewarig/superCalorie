import { rmSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { PATCH as updateGoal } from "@/app/api/auth/me/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { GET as getDay } from "@/app/api/entries/route";
import { DELETE as deleteEntry } from "@/app/api/entries/[id]/route";
import { POST as pushSync } from "@/app/api/entries/sync/route";
import { GET as getPhoto } from "@/app/api/photos/[id]/route";
import { POST as uploadPhoto } from "@/app/api/photos/route";
import { POST as logEntry } from "@/app/api/entries/route";
import { createToken, getSessionUser } from "@/lib/auth";
import { foods, users } from "@/lib/repo";
import { call, createAccount, getRequest } from "./helpers";

const ORIGIN = "http://localhost:3000";

/** A request whose body is not JSON at all, despite claiming to be. */
function malformed(path: string): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ this is not json",
  });
}

describe("malformed request bodies", () => {
  // Every route parses with `.catch(() => null)`; without a test the fallback
  // is never exercised and a crash here would only show up in production.
  it.each([
    ["signup", signup, 400],
    ["login", login, 401],
  ])("%s handles a broken JSON body without throwing", async (name, handler, status) => {
    const response = await call(handler, malformed(`/api/auth/${name}`));

    expect(response.status).toBe(status);
    expect((await response.json()).error).toBeTypeOf("string");
  });
});

describe("malformed bodies on authenticated routes", () => {
  it.each([
    ["PATCH /api/auth/me", updateGoal, "/api/auth/me", "PATCH"],
    ["POST /api/entries", logEntry, "/api/entries", "POST"],
    ["POST /api/entries/sync", pushSync, "/api/entries/sync", "POST"],
  ])("%s survives a broken JSON body", async (_name, handler, path, method) => {
    const { token } = await createAccount(`broken-${path.replace(/\W/g, "")}@example.com`);
    const response = await call(
      handler as (r: Request) => Promise<Response>,
      new Request(`${ORIGIN}${path}`, {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: "{ not json",
      }),
    );

    // 400, not a 500 — a bad body is the caller's mistake, not a crash.
    expect(response.status).toBe(400);
  });
});

describe("session expiry", () => {
  it("rejects a token past its lifetime", async () => {
    const { user } = await createAccount("expiring@example.com");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T00:00:00Z"));
    const token = createToken(user.id);

    // Still good the day after.
    vi.setSystemTime(new Date("2026-07-30T00:00:00Z"));
    expect(await getSessionUser(getRequest("/api/auth/me", token))).not.toBeNull();

    // Tokens last 30 days; a year on it must not still open the account.
    vi.setSystemTime(new Date("2027-07-29T00:00:00Z"));
    expect(await getSessionUser(getRequest("/api/auth/me", token))).toBeNull();

    vi.useRealTimers();
  });
});

describe("unauthenticated access", () => {
  it("401s reading a day", async () => {
    expect((await call(getDay, getRequest("/api/entries?date=2026-07-29"))).status).toBe(401);
  });

  it("401s updating the calorie goal", async () => {
    const response = await call(
      updateGoal,
      new Request(`${ORIGIN}/api/auth/me`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dailyCalorieGoal: 2500 }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("401s deleting an entry", async () => {
    const response = await call(
      deleteEntry,
      new Request(`${ORIGIN}/api/entries/whatever`, { method: "DELETE" }),
      { params: Promise.resolve({ id: "whatever" }) },
    );
    expect(response.status).toBe(401);
  });
});

describe("GET /api/entries date handling", () => {
  it("falls back to today when the date is missing or nonsense", async () => {
    const { token } = await createAccount("dates@example.com");

    for (const query of ["", "?date=not-a-date", "?date=2026-13-99x"]) {
      const body = await (await call(getDay, getRequest(`/api/entries${query}`, token))).json();
      // Rather than erroring or returning an empty set for a bogus date.
      expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("a photo whose file has gone missing", () => {
  it("410s instead of pretending it is still there", async () => {
    const { token } = await createAccount("gone@example.com");

    const form = new FormData();
    form.append("photo", new File([new Uint8Array([1, 2, 3])], "m.png", { type: "image/png" }));
    const uploaded = await call(
      uploadPhoto,
      new Request(`${ORIGIN}/api/photos`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      }),
    );
    const { photoId } = await uploaded.json();

    // Simulates a restore that brought the database back but not the images.
    rmSync(process.env.PHOTO_DIR!, { recursive: true, force: true });

    const response = await call(
      getPhoto,
      getRequest(`/api/photos/${photoId}`, token),
      { params: Promise.resolve({ id: photoId }) },
    );

    // 410 and not 404: the record exists, the bytes do not, and that
    // distinction is what tells an operator their backup is incomplete.
    expect(response.status).toBe(410);
  });
});

describe("repository lookups that find nothing", () => {
  it("returns null for a user id that does not exist", () => {
    expect(users.byId("no-such-user")).toBeNull();
  });

  it("returns null for a food id that does not exist", () => {
    expect(foods.byId("no-such-food")).toBeNull();
  });

  it("caches a remote food once, then returns the stored row", () => {
    const remote = {
      name: "Kale, raw",
      servingLabel: "100 g",
      calories: 35,
      protein: 3,
      carbs: 4,
      fat: 1,
      source: "usda" as const,
      externalId: "999001",
    };

    const first = foods.cacheRemote(remote);
    const second = foods.cacheRemote(remote);

    // Same row, not a duplicate — this is what stops a repeated search from
    // filling the table with copies of the same food.
    expect(second.id).toBe(first.id);
    expect(foods.search("Kale")).toHaveLength(1);
  });
});
