import { Text, View } from "react-native";
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
    <View>
      <View className="flex-row items-end gap-xs" style={{ height }}>
        {/* The goal line sits behind the columns, spanning the full width. */}
        {goalFraction === null ? null : (
          <View
            className="absolute left-0 right-0 border-t border-dashed border-line"
            style={{ bottom: goalFraction * height }}
          />
        )}
        {bars.map((bar) => (
          <View
            accessibilityLabel={`${bar.label}: ${bar.value} ${unit}`}
            className={`flex-1 rounded-t-full ${bar.over ? "bg-citrus" : "bg-moss"}`}
            key={bar.key}
            style={{
              // A logged day with a tiny value should still be visible as a
              // mark rather than vanishing into the axis.
              height: bar.value > 0 ? Math.max(bar.fraction * height, 3) : 2,
              opacity: bar.value > 0 ? 1 : 0.25,
            }}
          />
        ))}
      </View>
      <View className="mt-sm flex-row gap-xs">
        {bars.map((bar) => (
          <Text className="flex-1 text-center font-body text-caption text-muted" key={bar.key}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
