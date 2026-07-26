import { randomUUID } from "node:crypto";
import type { Food, FoodEntry, MealType, Totals, User } from "@supercalorie/core";
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
}

interface EntryRow extends FoodRow {
  quantity: number;
  meal: string;
  date: string;
  created_at: string;
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
  };
}

function toEntry(row: EntryRow): FoodEntry {
  return {
    id: row.id,
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
    const rows = all<FoodRow>("SELECT * FROM foods ORDER BY LENGTH(name) LIMIT ?", limit);
    return rows.map(toFood);
  },
};

export const entries = {
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
  }): FoodEntry {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    getDb().prepare(
      `INSERT INTO entries
         (id, user_id, food_id, name, quantity, serving_label, calories, protein, carbs, fat, meal, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    );
    return toEntry(one<EntryRow>("SELECT * FROM entries WHERE id = ?", id)!);
  },

  remove(userId: string, id: string): boolean {
    const result = getDb().prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").run(id, userId);
    return Number(result.changes) > 0;
  },
};

export function sumTotals(list: FoodEntry[]): Totals {
  return list.reduce<Totals>(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
