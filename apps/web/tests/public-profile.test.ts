import { describe, expect, it } from "vitest";
import {
  HIDDEN_PROFILE,
  buildHeatmap,
  buildPublicStats,
  currentStreak,
  handleError,
  lifetimeTotals,
  normaliseHandle,
  recentItems,
  topFoods,
  type FoodEntry,
  type ProfileVisibility,
} from "@supercalorie/core";

const TODAY = "2026-07-29";

function entry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: Math.random().toString(36).slice(2),
    foodId: null,
    name: "Roti",
    quantity: 1,
    servingLabel: "1 roti",
    calories: 100,
    protein: 3,
    carbs: 20,
    fat: 2,
    meal: "dinner",
    date: TODAY,
    createdAt: `${TODAY}T18:00:00.000Z`,
    photoId: null,
    ...overrides,
  };
}

describe("handles", () => {
  it.each(["gaurav", "gaurav-t", "a_b", "x1y", "abc123"])("accepts %s", (handle) => {
    expect(handleError(handle)).toBeNull();
  });

  it.each([
    ["ab", /3 characters/],
    ["a".repeat(31), /30 characters/],
    ["-gaurav", /lowercase/],
    ["gaurav-", /lowercase/],
    ["gau--rav", /lowercase/],
    ["gaurav t", /lowercase/],
  ])("rejects %s", (handle, message) => {
    expect(handleError(handle)).toMatch(message);
  });

  it("accepts mixed case and normalises it", () => {
    expect(handleError("Gaurav")).toBeNull();
    // Validation and storage have to agree, or a claimed handle becomes
    // unreachable at the URL people are given.
    expect(normaliseHandle("  GauRav  ")).toBe("gaurav");
  });

  it.each(["admin", "api", "settings", "supercalorie"])(
    "reserves %s so it can't be squatted or mistaken for official",
    (handle) => {
      expect(handleError(handle)).toMatch(/reserved/);
    },
  );

  it("is case-insensitive about reservations", () => {
    expect(handleError("ADMIN")).toMatch(/reserved/);
  });

  it("catches short reserved names on length before reaching the list", () => {
    // "u" is reserved and also too short; either message is correct, but the
    // length one fires first and is the more useful of the two.
    expect(handleError("u")).toMatch(/3 characters/);
  });
});

describe("the heatmap", () => {
  it("returns one cell per day with no gaps", () => {
    const grid = buildHeatmap([], 2000, 30, TODAY);

    expect(grid).toHaveLength(30);
    expect(grid[0].date).toBe("2026-06-30");
    expect(grid.at(-1)!.date).toBe(TODAY);
    // Days with nothing logged are present but empty, or the grid would
    // shift and misalign the calendar.
    expect(grid.every((day) => day.level === 0)).toBe(true);
  });

  it("shades relative to the person's own goal, not an absolute number", () => {
    const light = buildHeatmap([entry({ calories: 500 })], 2000, 1, TODAY);
    const heavy = buildHeatmap([entry({ calories: 500 })], 1000, 1, TODAY);

    // The same 500 kcal is a quarter of one goal and half of the other.
    expect(light[0].level).toBe(2);
    expect(heavy[0].level).toBe(3);
  });

  it.each([
    [0, 0],
    [100, 1],
    [600, 2],
    [1100, 3],
    [1900, 4],
    [3000, 4],
  ])("puts %i kcal against a 2000 goal at level %i", (calories, level) => {
    expect(buildHeatmap([entry({ calories })], 2000, 1, TODAY)[0].level).toBe(level);
  });

  it("does not divide by zero when someone has no goal", () => {
    expect(buildHeatmap([entry({ calories: 100 })], 0, 1, TODAY)[0].level).toBe(4);
  });

  it("sums several entries on the same day", () => {
    const grid = buildHeatmap(
      [entry({ calories: 300 }), entry({ calories: 700 })],
      2000,
      1,
      TODAY,
    );
    expect(grid[0].calories).toBe(1000);
  });
});

describe("streaks", () => {
  it("counts consecutive days back from today", () => {
    const entries = ["2026-07-29", "2026-07-28", "2026-07-27"].map((date) => entry({ date }));
    expect(currentStreak(entries, TODAY)).toBe(3);
  });

  it("survives today not being logged yet", () => {
    const entries = ["2026-07-28", "2026-07-27"].map((date) => entry({ date }));
    // Otherwise every streak would break each morning until breakfast.
    expect(currentStreak(entries, TODAY)).toBe(2);
  });

  it("stops at the first missing day", () => {
    const entries = ["2026-07-29", "2026-07-27", "2026-07-26"].map((date) => entry({ date }));
    expect(currentStreak(entries, TODAY)).toBe(1);
  });

  it("is zero with nothing logged", () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });
});

describe("top foods", () => {
  it("ranks by how often something is eaten", () => {
    const entries = [
      ...Array.from({ length: 3 }, () => entry({ name: "Banana", calories: 105 })),
      ...Array.from({ length: 5 }, () => entry({ name: "Roti", calories: 104 })),
      entry({ name: "Cake", calories: 900 }),
    ];

    const top = topFoods(entries);
    // Frequency, not calories — one enormous cake shouldn't outrank a staple.
    expect(top.map((food) => food.name)).toEqual(["Roti", "Banana", "Cake"]);
    expect(top[0]).toMatchObject({ count: 5, calories: 520 });
  });

  it("treats differently-cased names as the same food", () => {
    const top = topFoods([entry({ name: "Roti" }), entry({ name: "  roti " })]);
    expect(top).toHaveLength(1);
    expect(top[0].count).toBe(2);
  });

  it("honours the limit", () => {
    const entries = Array.from({ length: 20 }, (_, index) => entry({ name: `Food ${index}` }));
    expect(topFoods(entries, 10)).toHaveLength(10);
  });
});

describe("recent items", () => {
  it("returns newest first", () => {
    const entries = [
      entry({ name: "Old", date: "2026-07-01" }),
      entry({ name: "New", date: "2026-07-29" }),
      entry({ name: "Middle", date: "2026-07-15" }),
    ];
    expect(recentItems(entries).map((item) => item.name)).toEqual(["New", "Middle", "Old"]);
  });

  it("breaks ties within a day by when it was logged", () => {
    const entries = [
      entry({ name: "Breakfast", createdAt: "2026-07-29T08:00:00.000Z" }),
      entry({ name: "Dinner", createdAt: "2026-07-29T20:00:00.000Z" }),
    ];
    expect(recentItems(entries)[0].name).toBe("Dinner");
  });

  it("does not mutate what it was given", () => {
    const entries = [entry({ name: "A", date: "2026-07-01" }), entry({ name: "B", date: "2026-07-29" })];
    recentItems(entries);
    expect(entries[0].name).toBe("A");
  });
});

describe("lifetime totals", () => {
  it("counts distinct days, not entries", () => {
    const entries = [
      entry({ date: "2026-07-29", calories: 100 }),
      entry({ date: "2026-07-29", calories: 200 }),
      entry({ date: "2026-07-28", calories: 300 }),
    ];

    expect(lifetimeTotals(entries, TODAY)).toMatchObject({
      days: 2,
      entries: 3,
      calories: 600,
      currentStreak: 2,
    });
  });
});

describe("what a visitor is allowed to see", () => {
  const entries = [entry({ calories: 500 }), entry({ date: "2026-07-28", calories: 400 })];

  it("returns nothing at all when every section is off", () => {
    const stats = buildPublicStats(entries, 2000, HIDDEN_PROFILE, TODAY);

    // Absent, not null: a nulled key would still reveal that a section
    // exists and has been deliberately hidden.
    expect(Object.keys(stats)).toEqual([]);
  });

  it.each([
    ["showToday", "today"],
    ["showTotals", "totals"],
    ["showTopFoods", "topFoods"],
    ["showHeatmap", "heatmap"],
    ["showRecent", "recent"],
  ])("includes only %s when that alone is enabled", (flag, key) => {
    const visibility: ProfileVisibility = { ...HIDDEN_PROFILE, isPublic: true, [flag]: true };
    const stats = buildPublicStats(entries, 2000, visibility, TODAY);

    expect(Object.keys(stats)).toEqual([key]);
  });

  it("reports today against the goal when asked", () => {
    const stats = buildPublicStats(entries, 2000, { ...HIDDEN_PROFILE, showToday: true }, TODAY);
    expect(stats.today).toEqual({ calories: 500, goal: 2000 });
  });

  it("builds everything when it's all switched on", () => {
    const all: ProfileVisibility = {
      isPublic: true,
      showToday: true,
      showTotals: true,
      showTopFoods: true,
      showHeatmap: true,
      showRecent: true,
    };
    const stats = buildPublicStats(entries, 2000, all, TODAY);

    expect(Object.keys(stats).sort()).toEqual([
      "heatmap",
      "recent",
      "today",
      "topFoods",
      "totals",
    ]);
    expect(stats.heatmap).toHaveLength(365);
  });
});
