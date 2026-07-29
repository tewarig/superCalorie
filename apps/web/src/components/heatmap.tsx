import type { HeatmapDay } from "@supercalorie/core";

/** Cell colours by level: nothing logged, then quarters of the daily goal. */
const LEVEL_COLOURS = [
  "var(--parchment)",
  "#DFEDE4",
  "#A8D0B9",
  "#5FA37C",
  "var(--leaf)",
] as const;

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/**
 * A year of logging as a calendar grid, in the GitHub contributions style.
 *
 * Columns are weeks and rows are weekdays, so the first column is padded to
 * whichever day the year started on — without that the whole grid shears by
 * a day and the weekday labels lie.
 */
export function Heatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) return null;

  const weeks: (HeatmapDay | null)[][] = [];
  let week: (HeatmapDay | null)[] = [];

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

  const monthLabels = monthPositions(weeks);

  return (
    <div>
      <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] pl-8 text-[10px] text-ink-faint">
          {weeks.map((_, index) => (
            <span key={index} className="w-[11px] shrink-0">
              {monthLabels.get(index) ?? ""}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          <div className="flex w-8 flex-col gap-[3px] pr-1 text-right text-[10px] text-ink-faint">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index} className="h-[11px] leading-[11px]">
                {label}
              </span>
            ))}
          </div>

          {weeks.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }, (_, rowIndex) => {
                const day = column[rowIndex];
                if (!day) {
                  return <span key={rowIndex} className="h-[11px] w-[11px]" />;
                }
                return (
                  <span
                    key={rowIndex}
                    className="h-[11px] w-[11px] rounded-[2px]"
                    style={{ backgroundColor: LEVEL_COLOURS[day.level] }}
                    title={`${day.date}: ${day.calories > 0 ? `${day.calories} kcal` : "nothing logged"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

      </div>
      </div>

      {/* Outside the scroll container: inside, it scrolls off with the grid
          and is invisible until you drag sideways. */}
      <div className="flex items-center justify-end gap-1.5 pt-2 text-[10px] text-ink-faint">
        <span>Less</span>
        {LEVEL_COLOURS.map((colour, index) => (
          <span
            key={index}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: colour }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/** The column index where each month first appears, for the top axis. */
function monthPositions(weeks: (HeatmapDay | null)[][]): Map<number, string> {
  const labels = new Map<number, string>();
  let lastMonth = "";

  weeks.forEach((column, index) => {
    const firstDay = column.find((day): day is HeatmapDay => day !== null);
    if (!firstDay) return;

    const month = firstDay.date.slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      const name = new Date(`${firstDay.date}T00:00:00`).toLocaleString(undefined, {
        month: "short",
      });
      // Only label a month once it has room, or the names overlap.
      if (index === 0 || index - (([...labels.keys()].at(-1)) ?? -3) >= 3) {
        labels.set(index, name);
      }
    }
  });
  return labels;
}
