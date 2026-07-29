import { randomUUID } from "node:crypto";
import type {
  Food,
  FoodEntry,
  FoodSource,
  MealType,
  ProfileVisibility,
  User,
} from "@supercalorie/core";
import { getDb } from "./db";

/**
 * Query layer. Everything above this file speaks the shared domain types
 * from @supercalorie/core; only this file knows about SQL and snake_case.
 */

/**
 * node:sqlite types every row as `Record<string, SQLOutputValue>`. These
 * two helpers are the single place where we assert the shape a query
 * actually returns, so the rest of the file stays readable.
 */
type Param = string | number | null;

function all<Row>(sql: string, ...params: Param[]): Row[] {
  return getDb().prepare(sql).all(...params) as unknown as Row[];
}

function one<Row>(sql: string, ...params: Param[]): Row | undefined {
  return getDb().prepare(sql).get(...params) as unknown as Row | undefined;
}

export interface UserRecord extends User {
  passwordHash: string;
  salt: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  daily_calorie_goal: number;
  created_at: string;
}

interface FoodRow {
  id: string;
  name: string;
  serving_label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  external_id: string | null;
}

interface EntryRow extends FoodRow {
  food_id: string | null;
  quantity: number;
  meal: string;
  date: string;
  created_at: string;
  photo_id: string | null;
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    dailyCalorieGoal: row.daily_calorie_goal,
    createdAt: row.created_at,
    passwordHash: row.password_hash,
    salt: row.salt,
  };
}

function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    servingLabel: row.serving_label,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    /* v8 ignore next -- `source` is NOT NULL DEFAULT 'library', and the
       migration backfills it, so a null cannot reach here. */
    source: (row.source ?? "library") as FoodSource,
  };
}

function toEntry(row: EntryRow): FoodEntry {
  return {
    id: row.id,
    foodId: row.food_id ?? null,
    name: row.name,
    quantity: row.quantity,
    servingLabel: row.serving_label,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    meal: row.meal as MealType,
    date: row.date,
    createdAt: row.created_at,
    photoId: row.photo_id ?? null,
  };
}

/** Public shape — never leaks the password hash. */
export function publicUser(user: UserRecord): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    dailyCalorieGoal: user.dailyCalorieGoal,
    createdAt: user.createdAt,
  };
}

export const users = {
  create(input: {
    email: string;
    passwordHash: string;
    salt: string;
    name: string;
  }): UserRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    getDb().prepare(
      `INSERT INTO users (id, email, password_hash, salt, name, daily_calorie_goal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.email, input.passwordHash, input.salt, input.name, 2000, createdAt);
    return users.byId(id)!;
  },

  byId(id: string): UserRecord | null {
    const row = one<UserRow>("SELECT * FROM users WHERE id = ?", id);
    return row ? toUser(row) : null;
  },

  byEmail(email: string): UserRecord | null {
    const row = one<UserRow>("SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
    return row ? toUser(row) : null;
  },

  setGoal(id: string, goal: number): UserRecord | null {
    getDb().prepare("UPDATE users SET daily_calorie_goal = ? WHERE id = ?").run(goal, id);
    return users.byId(id);
  },
};

export const foods = {
  search(query: string, limit = 25): Food[] {
    // Rank prefix matches above mid-string matches so typing "ban" surfaces
    // "Banana" before "Whole wheat bread".
    const rows = all<FoodRow>(
      `SELECT * FROM foods
       WHERE name LIKE ?
       ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, LENGTH(name), name
       LIMIT ?`,
      `%${query}%`,
      `${query}%`,
      limit,
    );
    return rows.map(toFood);
  },

  byId(id: string): Food | null {
    const row = one<FoodRow>("SELECT * FROM foods WHERE id = ?", id);
    return row ? toFood(row) : null;
  },

  /** The user's most-logged foods, for a zero-typing quick-add list. */
  mostLogged(userId: string, limit = 8): Food[] {
    const rows = all<FoodRow>(
      `SELECT f.* FROM foods f
       JOIN entries e ON e.food_id = f.id
       WHERE e.user_id = ?
       GROUP BY f.id
       ORDER BY COUNT(e.id) DESC, MAX(e.created_at) DESC
       LIMIT ?`,
      userId,
      limit,
    );
    return rows.map(toFood);
  },

  /** Fallback for a brand-new account with no history yet. */
  starters(limit = 8): Food[] {
    const rows = all<FoodRow>(
      "SELECT * FROM foods WHERE source = 'library' ORDER BY LENGTH(name) LIMIT ?",
      limit,
    );
    return rows.map(toFood);
  },

  /**
   * Stores a food fetched from USDA or Open Food Facts, returning the local
   * row. Remote results are cached on first sight so that everything
   * downstream — logging, "your usuals", the history behind an old entry —
   * keeps working against local ids and stays available offline.
   */
  cacheRemote(food: Omit<Food, "id"> & { externalId: string }): Food {
    const existing = one<FoodRow>(
      "SELECT * FROM foods WHERE source = ? AND external_id = ?",
      food.source,
      food.externalId,
    );
    if (existing) return toFood(existing);

    const id = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO foods (id, name, serving_label, calories, protein, carbs, fat, source, external_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        food.name,
        food.servingLabel,
        food.calories,
        food.protein,
        food.carbs,
        food.fat,
        food.source,
        food.externalId,
      );
    return toFood(one<FoodRow>("SELECT * FROM foods WHERE id = ?", id)!);
  },
};

export const photos = {
  create(input: { userId: string; contentType: string; byteSize: number }): string {
    const id = randomUUID();
    getDb()
      .prepare(
        "INSERT INTO photos (id, user_id, content_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(id, input.userId, input.contentType, input.byteSize, new Date().toISOString());
    return id;
  },

  /** Scoped by user so one account can never read another's photos. */
  byId(userId: string, id: string): { id: string; contentType: string } | null {
    const row = one<{ id: string; content_type: string }>(
      "SELECT id, content_type FROM photos WHERE id = ? AND user_id = ?",
      id,
      userId,
    );
    return row ? { id: row.id, contentType: row.content_type } : null;
  },
};

interface ProfileRow {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_photo_id: string | null;
  is_public: number;
  show_today: number;
  show_totals: number;
  show_top_foods: number;
  show_heatmap: number;
  show_recent: number;
  created_at: string;
}

export interface ProfileRecord extends ProfileVisibility {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarPhotoId: string | null;
  createdAt: string;
}

// SQLite has no boolean type; 1/0 in, true/false out, in one place.
const toBool = (value: number) => value === 1;
const fromBool = (value: boolean) => (value ? 1 : 0);

function toProfile(row: ProfileRow): ProfileRecord {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    avatarPhotoId: row.avatar_photo_id,
    createdAt: row.created_at,
    isPublic: toBool(row.is_public),
    showToday: toBool(row.show_today),
    showTotals: toBool(row.show_totals),
    showTopFoods: toBool(row.show_top_foods),
    showHeatmap: toBool(row.show_heatmap),
    showRecent: toBool(row.show_recent),
  };
}

export const profiles = {
  byUser(userId: string): ProfileRecord | null {
    const row = one<ProfileRow>("SELECT * FROM profiles WHERE user_id = ?", userId);
    return row ? toProfile(row) : null;
  },

  byHandle(handle: string): ProfileRecord | null {
    const row = one<ProfileRow>("SELECT * FROM profiles WHERE handle = ?", handle.toLowerCase());
    return row ? toProfile(row) : null;
  },

  /**
   * Claims or updates a profile. A new profile is created hidden — the
   * caller has to switch each section on deliberately afterwards.
   */
  upsert(input: {
    userId: string;
    handle: string;
    displayName: string;
    bio: string | null;
    avatarPhotoId: string | null;
    visibility: ProfileVisibility;
  }): ProfileRecord {
    const { visibility: v } = input;
    getDb()
      .prepare(
        `INSERT INTO profiles
           (user_id, handle, display_name, bio, avatar_photo_id,
            is_public, show_today, show_totals, show_top_foods, show_heatmap, show_recent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           handle = excluded.handle,
           display_name = excluded.display_name,
           bio = excluded.bio,
           avatar_photo_id = excluded.avatar_photo_id,
           is_public = excluded.is_public,
           show_today = excluded.show_today,
           show_totals = excluded.show_totals,
           show_top_foods = excluded.show_top_foods,
           show_heatmap = excluded.show_heatmap,
           show_recent = excluded.show_recent`,
      )
      .run(
        input.userId,
        input.handle.toLowerCase(),
        input.displayName,
        input.bio,
        input.avatarPhotoId,
        fromBool(v.isPublic),
        fromBool(v.showToday),
        fromBool(v.showTotals),
        fromBool(v.showTopFoods),
        fromBool(v.showHeatmap),
        fromBool(v.showRecent),
        new Date().toISOString(),
      );
    return profiles.byUser(input.userId)!;
  },

  remove(userId: string): void {
    getDb().prepare("DELETE FROM profiles WHERE user_id = ?").run(userId);
  },
};

export const entries = {
  /** Every entry for a user, oldest first — the basis of a full export. */
  all(userId: string): FoodEntry[] {
    const rows = all<EntryRow>(
      "SELECT * FROM entries WHERE user_id = ? ORDER BY date, created_at",
      userId,
    );
    return rows.map(toEntry);
  },

  forDay(userId: string, date: string): FoodEntry[] {
    const rows = all<EntryRow>(
      "SELECT * FROM entries WHERE user_id = ? AND date = ? ORDER BY created_at",
      userId,
      date,
    );
    return rows.map(toEntry);
  },

  create(input: {
    userId: string;
    foodId: string | null;
    name: string;
    quantity: number;
    servingLabel: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meal: MealType;
    date: string;
    photoId?: string | null;
  }): FoodEntry {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    getDb().prepare(
      `INSERT INTO entries
         (id, user_id, food_id, name, quantity, serving_label, calories, protein, carbs, fat, meal, date, created_at, photo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.userId,
      input.foodId,
      input.name,
      input.quantity,
      input.servingLabel,
      input.calories,
      input.protein,
      input.carbs,
      input.fat,
      input.meal,
      input.date,
      createdAt,
      input.photoId ?? null,
    );
    return toEntry(one<EntryRow>("SELECT * FROM entries WHERE id = ?", id)!);
  },

  /**
   * Inserts an entry keeping the id it already has, which is what makes an
   * import idempotent — a re-sent document collides on the primary key
   * rather than creating a duplicate.
   */
  createWithId(input: FoodEntry & { userId: string }): void {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO entries
           (id, user_id, food_id, name, quantity, serving_label, calories, protein, carbs, fat, meal, date, created_at, photo_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        input.userId,
        input.foodId,
        input.name,
        input.quantity,
        input.servingLabel,
        input.calories,
        input.protein,
        input.carbs,
        input.fat,
        input.meal,
        input.date,
        input.createdAt,
        // Photo bytes don't travel with a snapshot, so a synced entry keeps
        // its text and numbers but not an image this server has never seen.
        null,
      );
  },

  remove(userId: string, id: string): boolean {
    const result = getDb().prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").run(id, userId);
    return Number(result.changes) > 0;
  },
};

// Totals are computed by the shared domain module so the server and the
// offline clients can never disagree about what a day adds up to.
export { sumTotals } from "@supercalorie/core";
