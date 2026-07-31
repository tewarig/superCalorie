import type { HeatmapDay } from "@supercalorie/core";
import { CELL, CELL_RADIUS, GAP, LABEL_GUTTER, LEVEL_COLOURS, WEEKDAY_LABELS, cellTitle, heatmapGrid } from "./geometry";

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
          <div className="flex text-[10px] text-muted" style={{ gap: GAP, paddingLeft: LABEL_GUTTER }}>
            {weeks.map((_, index) => (
              <span className="shrink-0" key={index} style={{ width: CELL }}>
                {monthLabels.get(index) ?? ""}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            <div className="flex flex-col pr-1 text-right text-[10px] text-muted" style={{ gap: GAP, width: LABEL_GUTTER }}>
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={index} style={{ height: CELL, lineHeight: `${CELL}px` }}>
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((column, columnIndex) => (
              <div className="flex flex-col" key={columnIndex} style={{ gap: GAP }}>
                {Array.from({ length: 7 }, (_, rowIndex) => {
                  const day = column[rowIndex];
                  if (!day) return <span key={rowIndex} style={{ height: CELL, width: CELL }} />;
                  return (
                    <span
                      key={rowIndex}
                      style={{ backgroundColor: LEVEL_COLOURS[day.level], borderRadius: CELL_RADIUS, height: CELL, width: CELL }}
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
            key={index}
            style={{ backgroundColor: colour, borderRadius: CELL_RADIUS, height: CELL, width: CELL }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
