import type { HeatmapDay } from "@supercalorie/core";
import { palette } from "../tokens";

/** Grid geometry, shared so the web and native builds cannot shear apart. */
export const CELL = 11;
export const GAP = 3;
export const CELL_RADIUS = 2;
/** Width of the weekday-label gutter to the left of the grid. */
export const LABEL_GUTTER = 32;

/** Cell colours by level: nothing logged, then quarters of the daily goal. */
export const LEVEL_COLOURS = [palette.mossPale, "#C6DFCB", "#8FC0A2", "#548E6E", palette.moss] as const;

/** Same ramp, exported separately so each platform's file only imports the one it renders. */
export const LEVEL_COLOURS_NATIVE = LEVEL_COLOURS;

export const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export interface HeatmapGrid {
  /** Columns of seven, Monday first. Nulls pad the first column. */
  weeks: (HeatmapDay | null)[][];
  /** Column index to month caption, for the axis above the grid. */
  monthLabels: Map<number, string>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Arranges a run of days into GitHub-style week columns.
 *
 * The first column is padded to whichever weekday the range starts on —
 * without that the whole grid shears by a day and the weekday labels lie.
 */
export function heatmapGrid(days: readonly HeatmapDay[]): HeatmapGrid {
  const weeks: (HeatmapDay | null)[][] = [];
  let week: (HeatmapDay | null)[] = [];

  if (days.length === 0) return { weeks, monthLabels: new Map() };

  // JS weeks start on Sunday; this grid starts on Monday, so shift by one.
  const firstDate = new Date(`${days[0].date}T00:00:00`);
  const leadingBlanks = (firstDate.getDay() + 6) % 7;
  for (let index = 0; index < leadingBlanks; index += 1) week.push(null);

  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  return { weeks, monthLabels: monthPositions(weeks) };
}

/** Labels a column when its first real day starts a new month. */
function monthPositions(weeks: (HeatmapDay | null)[][]): Map<number, string> {
  const labels = new Map<number, string>();
  let lastMonth = -1;

  weeks.forEach((week, index) => {
    const first = week.find((day): day is HeatmapDay => day !== null);
    // A column is only pushed once it holds a real day, so this cannot happen
    // from heatmapGrid — it guards the find() rather than a reachable state.
    /* v8 ignore next */
    if (!first) return;
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      labels.set(index, MONTHS[month]);
      lastMonth = month;
    }
  });

  return labels;
}

export function cellTitle(day: HeatmapDay): string {
  return `${day.date}: ${day.calories > 0 ? `${day.calories} kcal` : "nothing logged"}`;
}
