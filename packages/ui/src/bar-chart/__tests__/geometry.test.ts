import { barChartLayout } from "../geometry";

const WEEK = [
  { key: "1", label: "M", value: 1800 },
  { key: "2", label: "T", value: 2400 },
  { key: "3", label: "W", value: 0 },
];

describe("barChartLayout", () => {
  it("scales against the goal when every day falls short of it", () => {
    // Scaling to the tallest column would push the goal line off the top.
    const { peak, goalFraction } = barChartLayout([{ key: "1", label: "M", value: 500 }], 2000);
    expect(peak).toBe(2000);
    expect(goalFraction).toBe(1);
  });

  it("scales against the tallest column when it exceeds the goal", () => {
    const { peak, bars } = barChartLayout(WEEK, 2000);
    expect(peak).toBe(2400);
    expect(bars[1].fraction).toBe(1);
  });

  it("flags only the columns above the goal", () => {
    expect(barChartLayout(WEEK, 2000).bars.map((bar) => bar.over)).toEqual([false, true, false]);
  });

  it("averages only the days that were logged", () => {
    // The zero day is a day off, not a day of 0 kcal, so it must not drag
    // the average down.
    expect(barChartLayout(WEEK).average).toBe(2100);
  });

  it("returns a zero average for a week with nothing logged", () => {
    expect(barChartLayout([{ key: "1", label: "M", value: 0 }]).average).toBe(0);
  });

  it("produces no fractions and no goal line on an empty chart", () => {
    const { bars, goalFraction, peak } = barChartLayout([{ key: "1", label: "M", value: 0 }]);
    expect(peak).toBe(0);
    expect(bars[0].fraction).toBe(0);
    expect(goalFraction).toBeNull();
  });

  it("omits the goal line for a zero or absent goal", () => {
    expect(barChartLayout(WEEK).goalFraction).toBeNull();
    expect(barChartLayout(WEEK, 0).goalFraction).toBeNull();
    expect(barChartLayout(WEEK, 0).bars.every((bar) => !bar.over)).toBe(true);
  });

  it("handles an entirely empty data set", () => {
    expect(barChartLayout([])).toMatchObject({ peak: 0, average: 0, goalFraction: null, bars: [] });
  });
});
