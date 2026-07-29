import type { HeatmapDay } from "@supercalorie/core";
import { LEVEL_COLOURS, WEEKDAY_LABELS, cellTitle, heatmapGrid } from "./geometry";

/**
 * A year of logging as a calendar grid, in the GitHub contributions style.
 */
export function Heatmap({ days }: { days: readonly HeatmapDay[] }) {
  const { weeks, monthLabels } = heatmapGrid(days);
  if (weeks.length === 0) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] pl-8 text-[10px] text-muted">
            {weeks.map((_, index) => (
              <span className="w-[11px] shrink-0" key={index}>
                {monthLabels.get(index) ?? ""}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex w-8 flex-col gap-[3px] pr-1 text-right text-[10px] text-muted">
              {WEEKDAY_LABELS.map((label, index) => (
                <span className="h-[11px] leading-[11px]" key={index}>
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((column, columnIndex) => (
              <div className="flex flex-col gap-[3px]" key={columnIndex}>
                {Array.from({ length: 7 }, (_, rowIndex) => {
                  const day = column[rowIndex];
                  if (!day) return <span className="h-[11px] w-[11px]" key={rowIndex} />;
                  return (
                    <span
                      className="h-[11px] w-[11px] rounded-[2px]"
                      key={rowIndex}
                      style={{ backgroundColor: LEVEL_COLOURS[day.level] }}
                      title={cellTitle(day)}
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
      <div className="flex items-center justify-end gap-1.5 pt-2 text-[10px] text-muted">
        <span>Less</span>
        {LEVEL_COLOURS.map((colour, index) => (
          <span
            className="h-[11px] w-[11px] rounded-[2px]"
            key={index}
            style={{ backgroundColor: colour }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
