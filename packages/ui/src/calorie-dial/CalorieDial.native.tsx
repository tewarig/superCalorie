import { Text, View } from "react-native";
import { dialCaption, dialGeometry, type CalorieDialProps } from "./geometry";

export function CalorieDial({ eaten, goal }: CalorieDialProps) {
  const geometry = dialGeometry(eaten, goal);
  const { complete, over } = geometry;
  const degrees = Math.round(complete * 360);

  return (
    <View className="overflow-hidden rounded-card bg-ink p-xl">
      <View className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[24px] border-citrus" />
      <View className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[24px] border-transparent" style={{ transform: [{ rotate: `${degrees}deg` }] }} />
      <Text className="font-bold text-xs uppercase tracking-eyebrow text-dial-muted">Today&apos;s fuel</Text>
      <View className="mt-xxl flex-row items-end gap-sm">
        <Text className="font-display text-6xl text-paper">{eaten}</Text>
        <Text className="mb-sm font-medium text-base text-dial-muted">of {goal} kcal</Text>
      </View>
      <Text className={`mt-md font-bold text-sm ${over ? "text-citrus" : "text-dial-soft"}`}>{dialCaption(geometry)}</Text>
      <View className="mt-xl h-2 overflow-hidden rounded-full bg-dial-track">
        <View className={over ? "h-full rounded-full bg-citrus" : "h-full rounded-full bg-dial-fill"} style={{ width: `${complete * 100}%` }} />
      </View>
    </View>
  );
}
