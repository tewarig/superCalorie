import { barChartLayout, type BarInput } from "./geometry";

export function BarChart({
  data,
  goal,
  height = 120,
  unit = "kcal",
}: {
  data: readonly BarInput[];
  goal?: number;
  height?: number;
  unit?: string;
}) {
  const { bars, goalFraction } = barChartLayout(data, goal);

  return (
    <div>
      <div className="relative flex items-end gap-1" style={{ height }}>
        {/* The goal line sits behind the columns, spanning the full width. */}
        {goalFraction === null ? null : (
          <div
            className="absolute inset-x-0 border-t border-dashed border-line"
            style={{ bottom: goalFraction * height }}
          />
        )}
        {bars.map((bar) => (
          <div
            className={`flex-1 rounded-t-full ${bar.over ? "bg-citrus" : "bg-moss"}`}
            key={bar.key}
            style={{
              // A logged day with a tiny value should still be visible as a
              // mark rather than vanishing into the axis.
              height: bar.value > 0 ? Math.max(bar.fraction * height, 3) : 2,
              opacity: bar.value > 0 ? 1 : 0.25,
            }}
            title={`${bar.label}: ${bar.value} ${unit}`}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {bars.map((bar) => (
          <span className="flex-1 text-center text-[10px] text-muted" key={bar.key}>
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
