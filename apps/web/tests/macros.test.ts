import {
  DEFAULT_MACRO_SPLIT,
  MACRO_PRESETS,
  adjustSplit,
  macroTargets,
  parseMacroSplit,
  splitTotal,
  type MacroSplit,
} from "@supercalorie/core";
import { describe, expect, it } from "vitest";

describe("macroTargets", () => {
  it("splits the goal by percentage at 4/4/9 kcal per gram", () => {
    expect(macroTargets(2000, { protein: 30, carbs: 40, fat: 30 })).toEqual({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 67,
    });
  });

  it("follows a changed split rather than a fixed ratio", () => {
    const highProtein = macroTargets(2000, { protein: 40, carbs: 30, fat: 30 });
    expect(highProtein.protein).toBe(200);
    expect(highProtein.carbs).toBe(150);
  });

  it("returns zero grams for a zero goal instead of NaN", () => {
    expect(macroTargets(0, DEFAULT_MACRO_SPLIT)).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("adjustSplit", () => {
  it("keeps the total at exactly 100", () => {
    for (const percent of [0, 7, 33, 50, 99, 100]) {
      expect(splitTotal(adjustSplit(DEFAULT_MACRO_SPLIT, "protein", percent))).toBe(100);
    }
  });

  it("takes the difference from the other two in proportion", () => {
    // carbs 40 and fat 30 share the remaining 50 in a 4:3 ratio.
    expect(adjustSplit(DEFAULT_MACRO_SPLIT, "protein", 50)).toEqual({
      protein: 50,
      carbs: 29,
      fat: 21,
    });
  });

  it("clamps out-of-range input rather than producing a negative macro", () => {
    expect(adjustSplit(DEFAULT_MACRO_SPLIT, "carbs", 140)).toEqual({
      protein: 0,
      carbs: 100,
      fat: 0,
    });
    expect(splitTotal(adjustSplit(DEFAULT_MACRO_SPLIT, "carbs", -20))).toBe(100);
  });

  it("still totals 100 when the other two are both zero", () => {
    const allProtein: MacroSplit = { protein: 100, carbs: 0, fat: 0 };
    const adjusted = adjustSplit(allProtein, "protein", 60);
    expect(splitTotal(adjusted)).toBe(100);
    expect(adjusted.protein).toBe(60);
  });

  it("rounds without drifting off 100 on awkward numbers", () => {
    let split = DEFAULT_MACRO_SPLIT;
    for (const percent of [33, 17, 41, 3, 66]) {
      split = adjustSplit(split, "fat", percent);
      expect(splitTotal(split)).toBe(100);
    }
  });
});

describe("parseMacroSplit", () => {
  it("accepts a split that totals 100", () => {
    expect(parseMacroSplit({ protein: 25, carbs: 45, fat: 30 })).toEqual({
      protein: 25,
      carbs: 45,
      fat: 30,
    });
  });

  it.each([
    ["a total that is not 100", { protein: 10, carbs: 10, fat: 10 }],
    ["a negative percentage", { protein: -10, carbs: 60, fat: 50 }],
    ["a missing macro", { protein: 50, carbs: 50 }],
    ["a non-numeric value", { protein: "30", carbs: 40, fat: 30 }],
    ["not an object", "30/40/30"],
    ["null", null],
    ["undefined, as a v1 export has no split", undefined],
  ])("falls back to the default for %s", (_case, input) => {
    expect(parseMacroSplit(input)).toEqual(DEFAULT_MACRO_SPLIT);
  });

  it("does not rescale a drifted split, so the user never sees targets they did not choose", () => {
    // 50/30/30 sums to 110. Rescaling would silently show 45/27/27.
    expect(parseMacroSplit({ protein: 50, carbs: 30, fat: 30 })).toEqual(DEFAULT_MACRO_SPLIT);
  });
});

describe("MACRO_PRESETS", () => {
  it("every preset is a valid split", () => {
    for (const preset of MACRO_PRESETS) {
      expect(splitTotal(preset.split)).toBe(100);
    }
  });
});
