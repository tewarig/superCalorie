import { describe, expect, it } from "vitest";
import {
  SEED_FOODS,
  defaultMealForHour,
  mostLoggedFoods,
  scaleFood,
  searchFoods,
  seedFoodId,
  summariseDay,
  sumTotals,
  type Food,
  type FoodEntry,
} from "@supercalorie/core";

/**
 * These cover the logic that used to live behind the API. They matter more
 * than the route tests now: this is what runs when there is no server.
 */

function entry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: Math.random().toString(36).slice(2),
    foodId: null,
    name: "Thing",
    quantity: 1,
    servingLabel: "1 serving",
    calories: 100,
    protein: 5,
    carbs: 10,
    fat: 2,
    meal: "snack",
    date: "2026-07-26",
    createdAt: "2026-07-26T10:00:00.000Z",
    photoId: null,
    ...overrides,
  };
}

describe("the offline food library", () => {
  it("gives every food a stable id derived from its name", () => {
    expect(seedFoodId("Roti (whole wheat)")).toBe("lib:roti-whole-wheat");
    // Stability is what makes import/merge and "your usuals" work across
    // devices — a random id would break both.
    expect(seedFoodId("Banana")).toBe(seedFoodId("Banana"));
  });

  it("has no duplicate ids", () => {
    const ids = SEED_FOODS.map((food) => food.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships enough food to be useful with no network", () => {
    expect(SEED_FOODS.length).toBeGreaterThan(50);
    expect(SEED_FOODS.every((food) => food.calories > 0)).toBe(true);
    expect(SEED_FOODS.some((food) => food.name.includes("dosa"))).toBe(true);
  });
});

describe("searchFoods", () => {
  it("ranks prefix matches above mid-string ones", () => {
    const results = searchFoods("ban");
    expect(results[0].name).toBe("Banana");
  });

  it("is case and punctuation insensitive", () => {
    expect(searchFoods("ROTI")[0].name).toContain("Roti");
    expect(searchFoods("whole-wheat").length).toBeGreaterThan(0);
  });

  it("prefers the shorter name when both are prefix matches", () => {
    const results = searchFoods("plain");
    expect(results[0].name.length).toBeLessThanOrEqual(results[results.length - 1].name.length);
  });

  it("includes the user's own foods ahead of the library", () => {
    const mine: Food = {
      id: "custom-1",
      name: "Dal like mum makes",
      servingLabel: "1 bowl",
      calories: 210,
      protein: 11,
      carbs: 28,
      fat: 6,
      source: "library",
    };
    expect(searchFoods("dal", [mine])[0].id).toBe("custom-1");
  });

  it("returns nothing for an empty or unmatched query", () => {
    expect(searchFoods("")).toEqual([]);
    expect(searchFoods("   ")).toEqual([]);
    expect(searchFoods("zzzznotafood")).toEqual([]);
  });
});

describe("mostLoggedFoods", () => {
  it("orders by how often each food was logged", () => {
    const banana = seedFoodId("Banana");
    const roti = seedFoodId("Roti (whole wheat)");
    const entries = [
      entry({ foodId: roti }),
      entry({ foodId: banana }),
      entry({ foodId: banana }),
      entry({ foodId: banana }),
    ];

    expect(mostLoggedFoods(entries)[0].id).toBe(banana);
  });

  it("falls back to starters when there's no history", () => {
    const starters = mostLoggedFoods([]);
    expect(starters.length).toBeGreaterThan(0);
  });

  it("ignores custom entries, which have no food behind them", () => {
    const result = mostLoggedFoods([entry({ foodId: null }), entry({ foodId: null })]);
    // No food ids at all means no history to rank, so we're back to starters.
    expect(result.length).toBeGreaterThan(0);
  });

  it("drops references to foods that no longer exist", () => {
    const result = mostLoggedFoods([entry({ foodId: "lib:deleted-food" })]);
    expect(result.every((food) => food !== undefined)).toBe(true);
  });
});

describe("summariseDay", () => {
  it("only counts the requested day and sorts by when it was logged", () => {
    const entries = [
      entry({ date: "2026-07-25", calories: 999 }),
      entry({ date: "2026-07-26", calories: 200, createdAt: "2026-07-26T20:00:00.000Z" }),
      entry({ date: "2026-07-26", calories: 100, createdAt: "2026-07-26T08:00:00.000Z" }),
    ];

    const day = summariseDay(entries, "2026-07-26", 2000);

    expect(day.entries.map((e) => e.calories)).toEqual([100, 200]);
    expect(day.totals.calories).toBe(300);
    expect(day.remaining).toBe(1700);
  });

  it("never reports negative remaining once you're over", () => {
    const day = summariseDay([entry({ calories: 2500 })], "2026-07-26", 2000);
    expect(day.remaining).toBe(0);
    expect(day.totals.calories).toBe(2500);
  });
});

describe("scaleFood", () => {
  it("scales and rounds a half serving", () => {
    const roti = SEED_FOODS.find((food) => food.name.startsWith("Roti"))!;
    expect(scaleFood(roti, 0.5).calories).toBe(Math.round(roti.calories / 2));
  });

  it("handles a zero-macro food without producing NaN", () => {
    const oil: Food = {
      id: "x",
      name: "Oil",
      servingLabel: "1 tbsp",
      calories: 119,
      protein: 0,
      carbs: 0,
      fat: 14,
      source: "library",
    };
    expect(scaleFood(oil, 2)).toEqual({ calories: 238, protein: 0, carbs: 0, fat: 28 });
  });
});

describe("sumTotals", () => {
  it("is zero for an empty day", () => {
    expect(sumTotals([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe("defaultMealForHour", () => {
  it.each([
    [7, "breakfast"],
    [10, "breakfast"],
    [11, "lunch"],
    [15, "lunch"],
    [16, "dinner"],
    [20, "dinner"],
    [21, "snack"],
    [23, "snack"],
  ])("picks %s:00 → %s", (hour, expected) => {
    expect(defaultMealForHour(hour)).toBe(expected);
  });
});
