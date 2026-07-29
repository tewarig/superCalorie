import { Pressable, Text, View } from "react-native";

export type Segment<T extends string> = { label: string; value: T };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
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
