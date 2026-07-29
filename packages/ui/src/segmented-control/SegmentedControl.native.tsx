import { Pressable, Text, View } from "react-native";
import type { SegmentedControlProps } from "./types";

export type { Segment, SegmentedControlProps } from "./types";

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={`rounded-full px-4 py-2.5 ${active ? "bg-moss" : "border border-line bg-paper"}`}
            onPress={() => onChange(option.value)}
          >
            <Text className={`font-bold text-xs ${active ? "text-paper" : "text-muted"}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
