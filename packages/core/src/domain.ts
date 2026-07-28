import { SEED_FOODS } from "./foods-seed";
import type { DaySummary, Food, FoodEntry, MealType, Totals } from "./types";

/**
 * Pure domain logic, deliberately free of storage and network concerns.
 *
 * All of this used to live behind the API, which is why the apps could not
 * show you a single number without a server running. Anything needed to
 * render a day belongs here so it works offline.
 */

export function sumTotals(entries: FoodEntry[]): Totals {
  return entries.reduce<Totals>(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function summariseDay(
  entries: FoodEntry[],
  date: string,
  goal: number,
): DaySummary {
  const forDay = entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const totals = sumTotals(forDay);

  return {
    date,
    entries: forDay,
    totals,
    goal,
    remaining: Math.max(goal - totals.calories, 0),
  };
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Offline search over the built-in library plus anything the user added.
 * Prefix matches rank above mid-string ones, so "ban" surfaces Banana
 * rather than Whole wheat bread; shorter names win ties, which keeps plain
 * ingredients ahead of elaborate dishes that merely contain them.
 */
export function searchFoods(query: string, customFoods: Food[] = [], limit = 25): Food[] {
  const needle = normalise(query);
  if (!needle) return [];

  const isCustom = new Set(customFoods.map((food) => food.id));

  return [...customFoods, ...SEED_FOODS]
    .map((food) => {
      const haystack = normalise(food.name);
      const position = haystack.startsWith(needle) ? 0 : haystack.includes(needle) ? 1 : -1;
      if (position === -1) return null;

      // A food the user typed in themselves outranks a library entry at the
      // same match quality — they created it on purpose, so it's likely what
      // they mean. Without this, "Dal tadka" beats "Dal like mum makes" on
      // the name-length tiebreak alone.
      return { food, rank: position * 2 + (isCustom.has(food.id) ? 0 : 1) };
    })
    .filter((hit): hit is { food: Food; rank: number } => hit !== null)
    .sort((a, b) => a.rank - b.rank || a.food.name.length - b.food.name.length)
    .slice(0, limit)
    .map((hit) => hit.food);
}

/**
 * The foods this user logs most, for a quick-add list that needs no typing.
 * Falls back to short-named staples for an account with no history yet.
 */
export function mostLoggedFoods(
  entries: FoodEntry[],
  customFoods: Food[] = [],
  limit = 8,
): Food[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.foodId) counts.set(entry.foodId, (counts.get(entry.foodId) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return [...SEED_FOODS].sort((a, b) => a.name.length - b.name.length).slice(0, limit);
  }

  const byId = new Map([...customFoods, ...SEED_FOODS].map((food) => [food.id, food]));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((food): food is Food => food !== undefined)
    .slice(0, limit);
}

/** Scales a food to a quantity, rounding the way the server does. */
export function scaleFood(food: Food, quantity: number) {
  return {
    calories: Math.round(food.calories * quantity),
    protein: Math.round(food.protein * quantity),
    carbs: Math.round(food.carbs * quantity),
    fat: Math.round(food.fat * quantity),
  };
}

export function defaultMealForHour(hour: number): MealType {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
