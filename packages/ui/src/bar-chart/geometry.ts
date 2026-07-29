/**
 * Geometry for the column charts — the Apple Fitness "Step Count" shape.
 *
 * Same reasoning as the rings: plain numbers, so native and web draw the
 * identical picture without a charting dependency that only works on one of
 * them.
 */

export interface BarInput {
  /** Stable identity for the column, usually a date. */
  key: string;
  /** Axis caption. Only some columns are labelled, to avoid a crowded axis. */
  label: string;
  value: number;
}

export interface BarSlot extends BarInput {
  /** Height as a fraction of the plot area, 0..1. */
  fraction: number;
  /** True when this column exceeds the goal line. */
  over: boolean;
}

export interface BarChartLayout {
  bars: BarSlot[];
  /** The value the tallest column is scaled against. */
  peak: number;
  /** Where to draw the goal line, 0..1 from the bottom, or null to omit it. */
  goalFraction: number | null;
  /** Mean of the columns that have a value, rounded. */
  average: number;
}

/**
 * Scales columns against the larger of the tallest column and the goal.
 *
 * Scaling to the tallest column alone would redraw the whole chart every time
 * a single big day was logged, and would put the goal line off the top
 * whenever every day fell short of it.
 */
export function barChartLayout(data: readonly BarInput[], goal?: number): BarChartLayout {
  const highest = data.reduce((max, bar) => Math.max(max, bar.value), 0);
  const peak = Math.max(highest, goal ?? 0);

  const logged = data.filter((bar) => bar.value > 0);
  const average =
    logged.length > 0
      ? Math.round(logged.reduce((sum, bar) => sum + bar.value, 0) / logged.length)
      : 0;

  return {
    // A zero peak would divide by zero on an empty week, which is the first
    // thing a new user sees.
    bars: data.map((bar) => ({
      ...bar,
      fraction: peak > 0 ? bar.value / peak : 0,
      over: goal !== undefined && goal > 0 && bar.value > goal,
    })),
    peak,
    goalFraction: goal !== undefined && goal > 0 && peak > 0 ? goal / peak : null,
    average,
  };
}
