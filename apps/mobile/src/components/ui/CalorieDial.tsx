import { Text, View } from "react-native";

export function CalorieDial({ eaten, goal }: { eaten: number; goal: number }) {
  const ratio = goal > 0 ? eaten / goal : 0;
  const complete = Math.min(Math.max(ratio, 0), 1);
  const over = ratio > 1;
  const degrees = Math.round(complete * 360);
  const remaining = Math.max(goal - eaten, 0);

  return (
    <View className="overflow-hidden rounded-card bg-ink p-6">
      <View className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[24px] border-citrus" />
      <View className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[24px] border-transparent" style={{ transform: [{ rotate: `${degrees}deg` }] }} />
      <Text className="font-bold text-xs uppercase tracking-[3px] text-[#B4C7B9]">Today&apos;s fuel</Text>
      <View className="mt-8 flex-row items-end gap-2">
        <Text className="font-display text-6xl text-paper">{eaten}</Text>
        <Text className="mb-2 font-medium text-base text-[#B4C7B9]">of {goal} kcal</Text>
      </View>
      <Text className={`mt-3 font-bold text-sm ${over ? "text-citrus" : "text-[#DDEBDD]"}`}>
        {over ? `${eaten - goal} kcal over your goal` : `${remaining} kcal left to log`}
      </Text>
      <View className="mt-6 h-2 overflow-hidden rounded-full bg-[#365746]">
        <View className={over ? "h-full rounded-full bg-citrus" : "h-full rounded-full bg-[#E9C157]"} style={{ width: `${complete * 100}%` }} />
      </View>
    </View>
  );
}
