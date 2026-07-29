import type { Totals } from "./types";

/**
 * How the calorie goal is divided between the three macronutrients, as whole
 * percentages that always add up to 100.
 *
 * Percentages rather than grams: the calorie goal stays the single number the
 * user thinks in, and the split is a preference on top of it. Storing grams
 * instead would let the two disagree the moment the goal changed.
 */
export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
}

/** Atwater factors — kcal per gram of each macronutrient. */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** The conventional balanced split, and what every profile starts on. */
export const DEFAULT_MACRO_SPLIT: MacroSplit = { protein: 30, carbs: 40, fat: 30 };

export const MACRO_KEYS = ["protein", "carbs", "fat"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

/**
 * A few plans worth one tap, so the split is not a blank arithmetic puzzle.
 * These are common templates, not medical advice.
 */
export const MACRO_PRESETS: { name: string; split: MacroSplit }[] = [
  { name: "Balanced", split: DEFAULT_MACRO_SPLIT },
  { name: "High protein", split: { protein: 40, carbs: 30, fat: 30 } },
  { name: "Low carb", split: { protein: 35, carbs: 20, fat: 45 } },
  { name: "Endurance", split: { protein: 20, carbs: 55, fat: 25 } },
];

/**
 * Reads a split from untrusted input — an import file, or a server response.
 *
 * Anything that does not total 100 falls back to the default rather than
 * being rescaled. A split that has drifted is a sign the file was edited by
 * hand or written by an older client, and silently normalising it would show
 * the user targets they never chose.
 */
export function parseMacroSplit(value: unknown): MacroSplit {
  if (!value || typeof value !== "object") return DEFAULT_MACRO_SPLIT;
  const candidate = value as Partial<Record<MacroKey, unknown>>;

  const split = {} as MacroSplit;
  for (const key of MACRO_KEYS) {
    const percent = candidate[key];
    if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 0) {
      return DEFAULT_MACRO_SPLIT;
    }
    split[key] = Math.round(percent);
  }

  return splitTotal(split) === 100 ? split : DEFAULT_MACRO_SPLIT;
}

export function splitTotal(split: MacroSplit): number {
  return split.protein + split.carbs + split.fat;
}

/**
 * Moves one macro to `percent` and takes the difference out of the other two.
 *
 * A slider that let the total drift off 100 would be the bug here, so the
 * remainder is redistributed in proportion to what the other two already
 * hold — dragging protein up eats mostly into whichever of carbs and fat was
 * larger, which is what someone adjusting a plan expects. When the other two
 * are both zero there is nothing to take proportionally, so the remainder
 * goes to the next macro round-robin.
 */
export function adjustSplit(split: MacroSplit, key: MacroKey, percent: number): MacroSplit {
  const target = Math.min(Math.max(Math.round(percent), 0), 100);
  const others = MACRO_KEYS.filter((other) => other !== key);
  const remaining = 100 - target;
  const othersTotal = others.reduce((sum, other) => sum + split[other], 0);

  const next = { ...split, [key]: target } as MacroSplit;

  if (othersTotal === 0) {
    next[others[0]] = remaining;
    next[others[1]] = 0;
    return next;
  }

  // Round the first and give the second the remainder, so the total is exactly
  // 100 rather than 99 or 101 after two independent roundings.
  next[others[0]] = Math.round((split[others[0]] / othersTotal) * remaining);
  next[others[1]] = remaining - next[others[0]];
  return next;
}

/**
 * Target grams per macro, plus the calorie goal they belong to.
 *
 * Grams are derived, never stored: the goal and the split are the only inputs,
 * so the numbers on screen cannot contradict each other.
 */
export function macroTargets(dailyCalorieGoal: number, split: MacroSplit): Totals {
  return {
    calories: dailyCalorieGoal,
    protein: Math.round((dailyCalorieGoal * split.protein) / 100 / KCAL_PER_GRAM.protein),
    carbs: Math.round((dailyCalorieGoal * split.carbs) / 100 / KCAL_PER_GRAM.carbs),
    fat: Math.round((dailyCalorieGoal * split.fat) / 100 / KCAL_PER_GRAM.fat),
  };
}
