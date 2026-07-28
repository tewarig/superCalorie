import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SEED_FOODS } from "@supercalorie/core";

/**
 * SQLite persistence via Node's built-in driver — no native dependency to
 * compile. Requires `--experimental-sqlite` on Node 22 (baked into the npm
 * scripts); the flag is unnecessary from Node 24 onward.
 *
 * The connection is opened lazily on first query, never at import time:
 * `next build` imports every route module to collect page data, and having
 * a dozen build workers each open (and seed) the file deadlocks it.
 *
 * The handle is stashed on `globalThis` so Next.js dev-server hot reloads
 * reuse one connection instead of leaking a new one per reload.
 */

const DB_PATH = process.env.DATABASE_PATH ?? resolve(process.cwd(), ".data/supercalorie.db");

function connect(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const database = new DatabaseSync(DB_PATH);

  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA foreign_keys = ON");
  // Wait out a concurrent writer rather than failing instantly.
  database.exec("PRAGMA busy_timeout = 5000");

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      serving_label TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein INTEGER NOT NULL,
      carbs INTEGER NOT NULL,
      fat INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_id TEXT REFERENCES foods(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      serving_label TEXT NOT NULL DEFAULT '',
      calories INTEGER NOT NULL,
      protein INTEGER NOT NULL DEFAULT 0,
      carbs INTEGER NOT NULL DEFAULT 0,
      fat INTEGER NOT NULL DEFAULT 0,
      meal TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
  `);

  migrate(database);
  seedFoods(database);
  return database;
}

/**
 * `CREATE TABLE IF NOT EXISTS` above only helps a fresh database — it will
 * not add a column to a file that already exists. Anything added after the
 * first release therefore goes here, guarded by what the table actually has.
 */
function migrate(database: DatabaseSync) {
  const columns = (table: string): Set<string> =>
    new Set(
      (database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
        (row) => row.name,
      ),
    );

  const foodColumns = columns("foods");
  if (!foodColumns.has("source")) {
    // Where the row came from: the curated seed list, USDA, or Open Food Facts.
    database.exec("ALTER TABLE foods ADD COLUMN source TEXT NOT NULL DEFAULT 'library'");
  }
  if (!foodColumns.has("external_id")) {
    database.exec("ALTER TABLE foods ADD COLUMN external_id TEXT");
    // Remote results are cached into this table on first sight; the index is
    // what stops a repeated search from inserting the same food twice.
    // NULLs don't collide in SQLite, so curated rows are unaffected.
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_external ON foods(source, external_id)",
    );
  }

  if (!columns("entries").has("photo_id")) {
    database.exec("ALTER TABLE entries ADD COLUMN photo_id TEXT");
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seedFoods(database: DatabaseSync) {
  const { count } = database.prepare("SELECT COUNT(*) AS count FROM foods").get() as {
    count: number;
  };
  if (count > 0) return;

  const insert = database.prepare(
    `INSERT INTO foods (id, name, serving_label, calories, protein, carbs, fat, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'library')`,
  );
  // Seed ids come from the shared library rather than being random, so a
  // food has the same id on the server as it does on every device.
  for (const food of SEED_FOODS) {
    insert.run(food.id, food.name, food.servingLabel, food.calories, food.protein, food.carbs, food.fat);
  }
}

/**
 * Directory holding uploaded meal photos, kept beside the database file so
 * one volume holds all state. `:memory:` has no directory of its own, so
 * fall back to the conventional location.
 */
export const PHOTO_DIR =
  process.env.PHOTO_DIR ??
  (DB_PATH === ":memory:"
    ? resolve(process.cwd(), ".data/photos")
    : resolve(dirname(DB_PATH), "photos"));

const globalStore = globalThis as unknown as { __supercalorieDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  return (globalStore.__supercalorieDb ??= connect());
}
