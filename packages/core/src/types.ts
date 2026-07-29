export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export interface User {
  id: string;
  email: string;
  name: string;
  dailyCalorieGoal: number;
  createdAt: string;
}

/**
 * Where a food's numbers came from. Shown in the UI because the three are
 * not equally trustworthy: `usda` is lab-analysed, `off` is crowd-sourced
 * from product labels, and `library` is our curated seed list (the only one
 * that covers home-cooked dishes, at the cost of being an estimate).
 */
export type FoodSource = "library" | "usda" | "off";

export const SOURCE_LABELS: Record<FoodSource, string> = {
  library: "Estimate",
  usda: "USDA",
  off: "Label",
};

/** An item in the food library. Macros are per one serving. */
export interface Food {
  id: string;
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodSource;
  /** Set when the food came from a packaged product. */
  brand?: string;
}

/**
 * A logged food. Macros are denormalized onto the entry at log time so
 * that later corrections to the food library never rewrite history.
 */
export interface FoodEntry {
  id: string;
  /** The library food this came from, or null for a one-off custom entry. */
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
  createdAt: string;
  /** Fetch at `/api/photos/:id` when present. */
  photoId: string | null;
}

export interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DaySummary {
  date: string;
  entries: FoodEntry[];
  totals: Totals;
  goal: number;
  remaining: number;
}

export interface AuthResult {
  user: User;
  /** Bearer token for clients without a cookie jar (the mobile app). */
  token: string;
}

// macroTargets lives in ./macros now, next to the split it reads from.
