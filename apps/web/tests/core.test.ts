import { formatDateLabel, macroTargets, todayISO, type FoodEntry } from "@supercalorie/core";
import { describe, expect, it } from "vitest";
import { sumTotals } from "@/lib/repo";

describe("macroTargets", () => {
  it("splits the calorie goal 30/40/30 at 4/4/9 kcal per gram", () => {
    expect(macroTargets(2000)).toEqual({ calories: 2000, protein: 150, carbs: 200, fat: 67 });
  });

  it("stays internally consistent — the grams reconstruct the goal", () => {
    const { protein, carbs, fat } = macroTargets(2500);
    const reconstructed = protein * 4 + carbs * 4 + fat * 9;
    // Rounding to whole grams costs a few kcal at most.
    expect(Math.abs(reconstructed - 2500)).toBeLessThan(10);
  });
});

describe("todayISO", () => {
  it("uses local calendar components, not UTC", () => {
    // 11pm local on the 5th must stay the 5th, whatever the host offset is.
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("zero-pads single-digit months and days", () => {
    expect(todayISO(new Date(2026, 8, 9))).toBe("2026-09-09");
  });
});

describe("formatDateLabel", () => {
  it("names today and yesterday rather than printing a date", () => {
    const today = todayISO();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(formatDateLabel(today, today)).toBe("Today");
    expect(formatDateLabel(todayISO(yesterday), today)).toBe("Yesterday");
  });

  it("falls back to a weekday/month label for anything older", () => {
    const label = formatDateLabel("2026-01-05", todayISO());
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Yesterday");
    expect(label).toContain("Jan");
  });
});

describe("sumTotals", () => {
  const entry = (calories: number, protein: number, carbs: number, fat: number): FoodEntry => ({
    id: crypto.randomUUID(),
    name: "x",
    quantity: 1,
    servingLabel: "1 serving",
    calories,
    protein,
    carbs,
    fat,
    meal: "snack",
    date: "2026-01-01",
    createdAt: new Date().toISOString(),
  });

  it("returns zeroes for an empty day", () => {
    expect(sumTotals([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("adds each macro independently", () => {
    expect(sumTotals([entry(100, 10, 5, 2), entry(250, 3, 40, 8)])).toEqual({
      calories: 350,
      protein: 13,
      carbs: 45,
      fat: 10,
    });
  });
});
