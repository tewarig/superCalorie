/**
 * In-memory data store, scoped to the server process.
 *
 * This is a deliberate placeholder so the API contract can be built and
 * exercised end-to-end before a real database is chosen (Postgres/Prisma,
 * SQLite/Drizzle, etc.). Swap the Maps here for real queries and nothing
 * above this layer changes.
 *
 * `globalThis` stashing keeps the store alive across Next.js dev-server
 * hot reloads.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  dailyCalorieGoal: number;
  createdAt: string;
}

export interface FoodEntry {
  id: string;
  userId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  /** ISO date (YYYY-MM-DD) the entry belongs to. */
  date: string;
  createdAt: string;
}

interface Store {
  users: Map<string, User>;
  entries: Map<string, FoodEntry>;
}

const globalStore = globalThis as unknown as { __supercalorieStore?: Store };

export const db: Store = (globalStore.__supercalorieStore ??= {
  users: new Map(),
  entries: new Map(),
});

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  for (const user of db.users.values()) {
    if (user.email === normalized) return user;
  }
  return undefined;
}
