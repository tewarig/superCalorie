import type { HeatmapDay } from "@supercalorie/core";
import { cellTitle, heatmapGrid } from "../geometry";

function day(date: string, level = 0, calories = 0): HeatmapDay {
  return { date, level, calories } as HeatmapDay;
}

describe("heatmapGrid", () => {
  it("pads the first column so the weekday rows line up", () => {
    // 2026-01-01 is a Thursday, which is row 3 in a Monday-first grid.
    const { weeks } = heatmapGrid([day("2026-01-01")]);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]?.date).toBe("2026-01-01");
  });

  it("starts a Monday with no padding at all", () => {
    // 2026-01-05 is a Monday.
    const { weeks } = heatmapGrid([day("2026-01-05")]);
    expect(weeks[0][0]?.date).toBe("2026-01-05");
  });

  it("breaks into columns of seven", () => {
    const days = Array.from({ length: 14 }, (_, index) =>
      day(`2026-01-${String(index + 5).padStart(2, "0")}`),
    );
    const { weeks } = heatmapGrid(days);
    expect(weeks).toHaveLength(2);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("keeps a trailing part-week rather than dropping the most recent days", () => {
    const days = Array.from({ length: 9 }, (_, index) =>
      day(`2026-01-${String(index + 5).padStart(2, "0")}`),
    );
    const { weeks } = heatmapGrid(days);
    expect(weeks).toHaveLength(2);
    expect(weeks[1]).toHaveLength(2);
  });

  it("labels a column only when its first day starts a new month", () => {
    const days = [
      ...Array.from({ length: 7 }, (_, i) => day(`2026-01-${String(i + 26).padStart(2, "0")}`)),
      ...Array.from({ length: 7 }, (_, i) => day(`2026-02-${String(i + 2).padStart(2, "0")}`)),
    ];
    const { monthLabels } = heatmapGrid(days);
    expect(monthLabels.get(0)).toBe("Jan");
    expect(monthLabels.get(1)).toBe("Feb");
  });

  it("returns an empty grid rather than throwing on no data", () => {
    expect(heatmapGrid([])).toEqual({ weeks: [], monthLabels: new Map() });
  });
});

describe("cellTitle", () => {
  it("reads out the calories for a logged day", () => {
    expect(cellTitle(day("2026-07-26", 3, 2100))).toBe("2026-07-26: 2100 kcal");
  });

  it("says so plainly when nothing was logged", () => {
    expect(cellTitle(day("2026-07-26"))).toBe("2026-07-26: nothing logged");
  });
});
