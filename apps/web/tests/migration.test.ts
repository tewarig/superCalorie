import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The schema migration and the development secret cache both read the
 * environment once at module scope and touch real files, so they cannot be
 * exercised by the in-memory database the rest of the suite uses. Each test
 * here resets the module registry and points the environment at a throwaway
 * directory before importing.
 */

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "supercalorie-migration-"));
  vi.resetModules();
  // db.ts caches its connection on globalThis so Next's dev-server hot
  // reloads reuse one handle. That cache outlives resetModules, so without
  // clearing it every test here would silently reuse the previous
  // database — and pass for the wrong reason.
  delete (globalThis as { __supercalorieDb?: unknown }).__supercalorieDb;
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

/** Recreates the schema exactly as the first release shipped it. */
function writeV1Database(path: string) {
  const database = new DatabaseSync(path);
  database.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      salt TEXT NOT NULL, name TEXT NOT NULL,
      daily_calorie_goal INTEGER NOT NULL DEFAULT 2000, created_at TEXT NOT NULL);
    CREATE TABLE foods (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, serving_label TEXT NOT NULL,
      calories INTEGER NOT NULL, protein INTEGER NOT NULL,
      carbs INTEGER NOT NULL, fat INTEGER NOT NULL);
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_id TEXT REFERENCES foods(id) ON DELETE SET NULL,
      name TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1,
      serving_label TEXT NOT NULL DEFAULT '', calories INTEGER NOT NULL,
      protein INTEGER NOT NULL DEFAULT 0, carbs INTEGER NOT NULL DEFAULT 0,
      fat INTEGER NOT NULL DEFAULT 0, meal TEXT NOT NULL,
      date TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  database
    .prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)")
    .run("u1", "old@example.com", "hash", "salt", "Existing User", 2200, "2026-07-01T00:00:00Z");
  database
    .prepare("INSERT INTO foods VALUES (?,?,?,?,?,?,?)")
    .run("f1", "Legacy Roti", "1 roti", 104, 3, 20, 2);
  database
    .prepare("INSERT INTO entries VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run("e1", "u1", "f1", "Legacy Roti", 2, "1 roti", 208, 6, 40, 4, "dinner", "2026-07-20", "2026-07-20T18:00:00Z");
  database.close();
}

function columnsOf(path: string, table: string): string[] {
  const database = new DatabaseSync(path);
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  database.close();
  return rows.map((row) => row.name);
}

describe("upgrading a database from the first release", () => {
  it("adds the new columns without touching existing rows", async () => {
    const path = join(workspace, "supercalorie.db");
    writeV1Database(path);

    vi.stubEnv("DATABASE_PATH", path);
    const { getDb } = await import("@/lib/db");
    getDb(); // opening runs the migration

    expect(columnsOf(path, "foods")).toEqual(
      expect.arrayContaining(["source", "external_id"]),
    );
    expect(columnsOf(path, "entries")).toContain("photo_id");
    expect(columnsOf(path, "photos").length).toBeGreaterThan(0);

    const { users, entries, foods } = await import("@/lib/repo");
    // The point of the migration: nothing that was there before is lost.
    expect(users.byEmail("old@example.com")?.dailyCalorieGoal).toBe(2200);
    expect(entries.all("u1")).toHaveLength(1);
    expect(foods.byId("f1")?.name).toBe("Legacy Roti");
    // A pre-existing row has no source recorded, and must read as library.
    expect(foods.byId("f1")?.source).toBe("library");
  });

  it("does not re-seed over a database that already has foods", async () => {
    const path = join(workspace, "supercalorie.db");
    writeV1Database(path);

    vi.stubEnv("DATABASE_PATH", path);
    const { getDb } = await import("@/lib/db");
    const database = getDb();

    const { count } = database.prepare("SELECT COUNT(*) AS count FROM foods").get() as {
      count: number;
    };
    // Seeding on top would bury the user's history under 60 duplicates.
    expect(count).toBe(1);
  });

  it("is safe to run twice", async () => {
    const path = join(workspace, "supercalorie.db");
    writeV1Database(path);
    vi.stubEnv("DATABASE_PATH", path);

    const first = await import("@/lib/db");
    first.getDb();

    // Both the module registry and the globalThis handle have to go, or the
    // second getDb() hands back the cached connection and migrate() never
    // runs again — the test would pass without exercising anything.
    vi.resetModules();
    delete (globalThis as { __supercalorieDb?: unknown }).__supercalorieDb;

    const second = await import("@/lib/db");
    expect(() => second.getDb()).not.toThrow();

    // Still exactly one of each column, and the data is untouched.
    expect(columnsOf(path, "foods").filter((c) => c === "source")).toHaveLength(1);
    const { entries } = await import("@/lib/repo");
    expect(entries.all("u1")).toHaveLength(1);
  });

  it("seeds the food library into a brand-new database", async () => {
    const path = join(workspace, "fresh.db");
    vi.stubEnv("DATABASE_PATH", path);

    const { getDb } = await import("@/lib/db");
    const { count } = getDb().prepare("SELECT COUNT(*) AS count FROM foods").get() as {
      count: number;
    };

    expect(count).toBeGreaterThan(50);
  });
});

describe("the development session secret", () => {
  it("is generated once and reused, so a restart doesn't sign everyone out", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_PATH", join(workspace, "db.sqlite"));
    // The cache lands relative to cwd, which is the app directory.
    const cachePath = join(process.cwd(), ".data/dev-session-secret");
    rmSync(cachePath, { force: true });

    // A token embeds its own expiry, so two tokens minted at different
    // instants differ no matter what key signed them. Freezing the clock is
    // what makes the signatures comparable at all.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T00:00:00Z"));

    try {
      const first = await import("@/lib/auth");
      const token = first.createToken("user-1");
      expect(existsSync(cachePath)).toBe(true);
      const cached = readFileSync(cachePath, "utf8").trim();

      // A fresh process reads the same secret off disk, so a token signed
      // before the restart still verifies after it.
      vi.resetModules();
      const second = await import("@/lib/auth");

      expect(readFileSync(cachePath, "utf8").trim()).toBe(cached);
      expect(second.createToken("user-1")).toBe(token);
    } finally {
      vi.useRealTimers();
      rmSync(cachePath, { force: true });
    }
  });

  it("refuses to sign anything in production without a secret", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    const { createToken } = await import("@/lib/auth");
    // Falling back to a generated key here would silently invalidate every
    // session on each deploy, which looks like random logouts.
    expect(() => createToken("user-1")).toThrow(/SESSION_SECRET must be set/);
  });
});
