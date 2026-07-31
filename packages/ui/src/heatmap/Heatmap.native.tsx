import type { HeatmapDay } from "@supercalorie/core";
import { ScrollView, Text, View } from "react-native";
import { CELL, CELL_RADIUS, GAP, LABEL_GUTTER, LEVEL_COLOURS_NATIVE, WEEKDAY_LABELS, cellTitle, heatmapGrid } from "./geometry";

/**
 * A year of logging as a calendar grid, in the GitHub contributions style.
 *
 * Scrolls horizontally: a full year is 53 columns, which is wider than any
 * phone, and squeezing it to fit would make the cells too small to read.
 */
export function Heatmap({ days }: { days: readonly HeatmapDay[] }) {
  const { weeks, monthLabels } = heatmapGrid(days);
  if (weeks.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View className="flex-row" style={{ gap: GAP, paddingLeft: LABEL_GUTTER }}>
          {weeks.map((_, index) => (
            <Text className="font-body text-[9px] text-muted" key={index} style={{ width: CELL }}>
              {monthLabels.get(index) ?? ""}
            </Text>
          ))}
        </View>

        <View className="flex-row" style={{ gap: GAP, marginTop: GAP }}>
          <View style={{ gap: GAP, width: LABEL_GUTTER - 4, paddingRight: 4 }}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text
                className="text-right font-body text-[9px] text-muted"
                key={index}
                style={{ height: CELL, lineHeight: CELL }}
              >
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((column, columnIndex) => (
            <View key={columnIndex} style={{ gap: GAP }}>
              {Array.from({ length: 7 }, (_, rowIndex) => {
                const day = column[rowIndex];
                return (
                  <View
                    accessibilityLabel={day ? cellTitle(day) : undefined}
                    key={rowIndex}
                    style={{
                      backgroundColor: day ? LEVEL_COLOURS_NATIVE[day.level] : "transparent",
                      borderRadius: CELL_RADIUS,
                      height: CELL,
                      width: CELL,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
