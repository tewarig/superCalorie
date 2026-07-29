import { Text, View } from "react-native";

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View className="mt-5 flex-row items-end justify-between">
      <Text className="font-display text-2xl text-ink">{title}</Text>
      {detail ? <Text className="font-bold text-xs uppercase tracking-wider text-muted">{detail}</Text> : null}
    </View>
  );
}
