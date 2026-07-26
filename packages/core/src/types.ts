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

/** An item in the food library. Macros are per one serving. */
export interface Food {
  id: string;
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * A logged food. Macros are denormalized onto the entry at log time so
 * that later corrections to the food library never rewrite history.
 */
export interface FoodEntry {
  id: string;
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

/**
 * Macro targets derived from the calorie goal using a conventional
 * 30/40/30 split (protein/carbs/fat) at 4/4/9 kcal per gram. Users can't
 * set these independently yet, so deriving them keeps the two numbers
 * from ever disagreeing.
 */
export function macroTargets(dailyCalorieGoal: number): Totals {
  return {
    calories: dailyCalorieGoal,
    protein: Math.round((dailyCalorieGoal * 0.3) / 4),
    carbs: Math.round((dailyCalorieGoal * 0.4) / 4),
    fat: Math.round((dailyCalorieGoal * 0.3) / 9),
  };
}
