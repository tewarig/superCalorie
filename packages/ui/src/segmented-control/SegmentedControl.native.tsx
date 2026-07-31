import { Pressable, Text, View } from "react-native";
import type { SegmentedControlProps } from "./types";

export type { Segment, SegmentedControlProps } from "./types";

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-sm">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={`rounded-full px-lg py-sm ${active ? "bg-primary" : "border border-line bg-paper"}`}
            onPress={() => onChange(option.value)}
          >
            <Text className={`font-bold text-xs ${active ? "text-paper" : "text-muted"}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
