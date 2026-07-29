import { SNAPSHOT_VERSION, type Snapshot } from "@supercalorie/core";
import { describe, expect, it } from "vitest";
import { PATCH as updateGoal } from "@/app/api/auth/me/route";
import { POST as logEntry } from "@/app/api/entries/route";
import { GET as exportAll } from "@/app/api/export/route";
import { GET as health } from "@/app/api/health/route";
import { POST as importSnapshot } from "@/app/api/import/route";
import { GET as spec } from "@/app/api/openapi.json/route";
import { call, createAccount, getRequest, jsonRequest } from "./helpers";

const ORIGIN = "http://localhost:3000";

function snapshotBody(body: unknown, token?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`${ORIGIN}/api/import`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function entry(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    foodId: null,
    name: "Imported",
    quantity: 1,
    servingLabel: "1 serving",
    calories: 300,
    protein: 10,
    carbs: 30,
    fat: 8,
    meal: "lunch",
    date: "2026-07-29",
    createdAt: "2026-07-29T12:00:00.000Z",
    photoId: null,
    ...overrides,
  };
}

const snapshot = (entries: unknown[]): Snapshot =>
  ({
    version: SNAPSHOT_VERSION,
    profile: { name: "From a device", dailyCalorieGoal: 2600 },
    entries,
    customFoods: [],
  }) as unknown as Snapshot;

describe("GET /api/health", () => {
  it("reports up without needing credentials", async () => {
    const response = await call(health, getRequest("/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "supercalorie-api" });
  });
});

describe("GET /api/openapi.json", () => {
  it("serves the spec unauthenticated, so a client generator can read it", async () => {
    const response = await call(spec, getRequest("/api/openapi.json"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("GET /api/export", () => {
  it("returns everything, across every day", async () => {
    const { token } = await createAccount("export@example.com");
    for (const date of ["2026-07-27", "2026-07-28"]) {
      await call(
        logEntry,
        jsonRequest("POST", "/api/entries", { name: "Roti", calories: 104, meal: "dinner", date }, token),
      );
    }

    const body = await (await call(exportAll, getRequest("/api/export", token))).json();

    expect(body.version).toBe(SNAPSHOT_VERSION);
    expect(body.entries).toHaveLength(2);
    // Sorted by date, which is what makes a diff between two exports readable.
    expect(body.entries.map((e: { date: string }) => e.date)).toEqual([
      "2026-07-27",
      "2026-07-28",
    ]);
    expect(body.profile.dailyCalorieGoal).toBe(2000);
  });

  it("offers itself as a download", async () => {
    const { token } = await createAccount("download@example.com");
    const response = await call(exportAll, getRequest("/api/export", token));

    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename=/);
  });

  it("401s without credentials", async () => {
    expect((await call(exportAll, getRequest("/api/export"))).status).toBe(401);
  });
});

describe("POST /api/import", () => {
  it("adds entries and is idempotent on a second run", async () => {
    const { token } = await createAccount("import@example.com");
    const document = snapshot([entry("a"), entry("b")]);

    const first = await (await call(importSnapshot, snapshotBody(document, token))).json();
    expect(first).toEqual({ added: 2, skipped: 0 });

    const second = await (await call(importSnapshot, snapshotBody(document, token))).json();
    expect(second).toEqual({ added: 0, skipped: 2 });
  });

  it("round-trips: what comes out of export goes back in unchanged", async () => {
    const { token } = await createAccount("round@example.com");
    await call(
      logEntry,
      jsonRequest(
        "POST",
        "/api/entries",
        { name: "Dal", calories: 180, meal: "dinner", date: "2026-07-29" },
        token,
      ),
    );

    const exported = await (await call(exportAll, getRequest("/api/export", token))).json();
    const result = await (await call(importSnapshot, snapshotBody(exported, token))).json();

    // Nothing new, because it is already there — the two formats agree.
    expect(result).toEqual({ added: 0, skipped: 1 });
  });

  it("never lets an imported profile overwrite this account's goal", async () => {
    const { token } = await createAccount("goal@example.com");
    await call(updateGoal, jsonRequest("PATCH", "/api/auth/me", { dailyCalorieGoal: 1800 }, token));

    await call(importSnapshot, snapshotBody(snapshot([entry("x")]), token));

    const body = await (await call(exportAll, getRequest("/api/export", token))).json();
    expect(body.profile.dailyCalorieGoal).toBe(1800);
  });

  it("keeps one account's import out of another's data", async () => {
    const mine = await createAccount("mine@example.com");
    const theirs = await createAccount("theirs@example.com");

    await call(importSnapshot, snapshotBody(snapshot([entry("shared-id")]), mine.token));
    const theirExport = await (
      await call(exportAll, getRequest("/api/export", theirs.token))
    ).json();

    expect(theirExport.entries).toHaveLength(0);
  });

  it.each([
    ["not json at all", /valid JSON/i],
    ['{"version":99,"entries":[]}', /version/i],
    ['{"version":1}', /entries/i],
  ])("rejects %s", async (body, message) => {
    const { token } = await createAccount(`bad-${Math.random().toString(36).slice(2)}@example.com`);
    const response = await call(importSnapshot, snapshotBody(body, token));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(message);
  });

  it("401s without credentials", async () => {
    const response = await call(importSnapshot, snapshotBody(snapshot([entry("a")])));
    expect(response.status).toBe(401);
  });

  it("drops photo references, since the bytes don't travel in a snapshot", async () => {
    const { token } = await createAccount("photoref@example.com");
    await call(
      importSnapshot,
      snapshotBody(snapshot([entry("with-photo", { photoId: "id-from-another-device" })]), token),
    );

    const body = await (await call(exportAll, getRequest("/api/export", token))).json();
    // Keeping the id would leave an entry pointing at an image this server
    // has never seen, rendering as a permanently broken thumbnail.
    expect(body.entries[0].photoId).toBeNull();
  });
});
