import { todayISO } from "./date";
import type { FoodEntry, MealType } from "./types";

/**
 * Everything behind a shareable profile page.
 *
 * Kept pure and separate from storage so the same numbers can be produced on
 * a server, in a test, or locally for a preview before anything is published.
 *
 * The governing rule is that nothing here is visible by default. A food log
 * says a great deal about a person — when they wake, when they stop eating,
 * whether they are dieting — so every section is opt-in and the caller
 * decides what to compute at all.
 */

/** Lowercase, 3–30 chars, no leading/trailing or doubled separators. */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9]|[-_](?![-_])){1,28}[a-z0-9]$/;

/**
 * Names that would collide with a route or impersonate the service. Checked
 * before a handle is claimed, since /u/admin looking official is a problem
 * that is hard to undo once someone owns it.
 */
const RESERVED_HANDLES = new Set([
  "admin", "administrator", "api", "app", "auth", "settings", "support",
  "help", "about", "login", "logout", "signup", "signin", "register",
  "supercalorie", "official", "staff", "team", "root", "system", "null",
  "undefined", "new", "edit", "delete", "me", "you", "user", "users",
  "public", "private", "static", "assets", "docs", "u",
]);

/**
 * Handles are case-insensitive, so this is the one place that decides what a
 * handle *is*. Exported because validating and storing must agree: normalise
 * on the way in, or "Gaurav" validates and then gets stored where nobody
 * looking up "gaurav" will find it.
 */
export function normaliseHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

export function handleError(handle: string): string | null {
  const value = normaliseHandle(handle);

  if (value.length < 3) return "Handles need at least 3 characters.";
  if (value.length > 30) return "Handles can be at most 30 characters.";
  if (RESERVED_HANDLES.has(value)) return "That handle is reserved.";
  if (!HANDLE_PATTERN.test(value)) {
    return "Use lowercase letters, numbers, hyphens and underscores; start and end with a letter or number.";
  }
  return null;
}

/** Which sections the owner has chosen to publish. All false by default. */
export interface ProfileVisibility {
  /** The page exists at all. Off means 404 to everyone but the owner. */
  isPublic: boolean;
  showToday: boolean;
  showTotals: boolean;
  showTopFoods: boolean;
  showHeatmap: boolean;
  showRecent: boolean;
}

export const HIDDEN_PROFILE: ProfileVisibility = {
  isPublic: false,
  showToday: false,
  showTotals: false,
  showTopFoods: false,
  showHeatmap: false,
  showRecent: false,
};

export interface HeatmapDay {
  date: string;
  calories: number;
  /** 0 = nothing logged, 1–4 = quarters of the daily goal. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface TopFood {
  name: string;
  count: number;
  calories: number;
}

export interface RecentItem {
  date: string;
  name: string;
  calories: number;
  meal: MealType;
}

export interface PublicStats {
  today?: { calories: number; goal: number };
  totals?: { days: number; entries: number; calories: number; currentStreak: number };
  topFoods?: TopFood[];
  heatmap?: HeatmapDay[];
  recent?: RecentItem[];
}

/**
 * A profile as its owner sees it — including the flags, which a visitor
 * never receives. The server's ProfileRecord is this shape.
 */
export interface OwnProfile extends ProfileVisibility {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarPhotoId: string | null;
  createdAt: string;
}

export interface PublicProfile {
  handle: string;
  displayName: string;
  bio: string | null;
  avatarPhotoId: string | null;
  joinedAt: string;
  stats: PublicStats;
}

/**
 * A year of daily totals, oldest first, with every day present so the grid
 * has no holes. `level` is relative to the person's own goal rather than an
 * absolute number, so the shading means the same thing for someone eating
 * 1800 as for someone eating 3000.
 */
export function buildHeatmap(
  entries: FoodEntry[],
  goal: number,
  days = 365,
  today = todayISO(),
): HeatmapDay[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.calories);
  }

  const [year, month, day] = today.split("-").map(Number);
  const cursor = new Date(year, month - 1, day - days + 1);
  const grid: HeatmapDay[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = todayISO(cursor);
    const calories = totals.get(date) ?? 0;
    grid.push({ date, calories, level: levelFor(calories, goal) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return grid;
}

function levelFor(calories: number, goal: number): HeatmapDay["level"] {
  if (calories <= 0) return 0;
  // A goal of zero would divide by zero; treat any logging as the top band.
  if (goal <= 0) return 4;

  const ratio = calories / goal;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/** Consecutive days with at least one entry, counting back from today. */
export function currentStreak(entries: FoodEntry[], today = todayISO()): number {
  const logged = new Set(entries.map((entry) => entry.date));
  const [year, month, day] = today.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);

  // Today not being logged yet shouldn't break a run — start from yesterday
  // in that case, or someone loses their streak every morning.
  if (!logged.has(todayISO(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (logged.has(todayISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Most-logged foods, by how often they appear rather than by calories. */
export function topFoods(entries: FoodEntry[], limit = 10): TopFood[] {
  const tally = new Map<string, TopFood>();

  for (const entry of entries) {
    // Group by name, not id: a custom "Mum's dal" and a library one should
    // read as the same food to a visitor.
    const key = entry.name.trim().toLowerCase();
    const existing = tally.get(key);
    if (existing) {
      existing.count += 1;
      existing.calories += entry.calories;
    } else {
      tally.set(key, { name: entry.name.trim(), count: 1, calories: entry.calories });
    }
  }

  return [...tally.values()]
    .sort((a, b) => b.count - a.count || b.calories - a.calories || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function lifetimeTotals(entries: FoodEntry[], today = todayISO()) {
  return {
    days: new Set(entries.map((entry) => entry.date)).size,
    entries: entries.length,
    calories: entries.reduce((sum, entry) => sum + entry.calories, 0),
    currentStreak: currentStreak(entries, today),
  };
}

/** The newest entries, most recent first. */
export function recentItems(entries: FoodEntry[], limit = 10): RecentItem[] {
  return [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((entry) => ({
      date: entry.date,
      name: entry.name,
      calories: entry.calories,
      meal: entry.meal,
    }));
}

/**
 * Assembles only the sections the owner has switched on. Anything hidden is
 * absent rather than nulled, so a hidden section cannot be inferred from the
 * shape of the response.
 */
export function buildPublicStats(
  entries: FoodEntry[],
  goal: number,
  visibility: ProfileVisibility,
  today = todayISO(),
): PublicStats {
  const stats: PublicStats = {};

  if (visibility.showToday) {
    const todaysEntries = entries.filter((entry) => entry.date === today);
    stats.today = {
      calories: todaysEntries.reduce((sum, entry) => sum + entry.calories, 0),
      goal,
    };
  }
  if (visibility.showTotals) stats.totals = lifetimeTotals(entries, today);
  if (visibility.showTopFoods) stats.topFoods = topFoods(entries);
  if (visibility.showHeatmap) stats.heatmap = buildHeatmap(entries, goal, 365, today);
  if (visibility.showRecent) stats.recent = recentItems(entries);

  return stats;
}
