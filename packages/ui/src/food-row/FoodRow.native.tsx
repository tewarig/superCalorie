import { Image, Pressable, Text, View } from "react-native";
import { AppButton } from "../app-button/AppButton.native";
import { initial, rowClasses, type FoodResultRowProps, type LoggedFoodRowProps } from "./types";

export function FoodResultRow({ name, meta, source, onHalf, onAdd, divider = true }: FoodResultRowProps) {
  return (
    <View className={`flex-row items-center gap-2 ${rowClasses(divider)}`}>
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-base text-ink" numberOfLines={1}>{name}</Text>
        <Text className="mt-0.5 font-body text-xs text-muted"><Text className="font-bold uppercase text-citrus">{source}</Text>{"  "}{meta}</Text>
      </View>
      <AppButton size="sm" tone="quiet" onPress={onHalf}>½</AppButton>
      <AppButton size="sm" onPress={onAdd}>Add</AppButton>
    </View>
  );
}

export function LoggedFoodRow({ name, meta, calories, photoUri, onRemove, divider = true }: LoggedFoodRowProps) {
  return (
    <View className={`flex-row items-center gap-3 ${rowClasses(divider)}`}>
      {photoUri ? <Image accessibilityLabel={`${name} photo`} className="h-11 w-11 rounded-control border border-line" source={{ uri: photoUri }} /> : <View className="h-11 w-11 items-center justify-center rounded-control bg-moss-pale"><Text className="font-display text-xl text-moss">{initial(name)}</Text></View>}
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-base text-ink" numberOfLines={1}>{name}</Text>
        <Text className="mt-0.5 font-body text-xs text-muted">{meta}</Text>
      </View>
      <Text className="font-display text-xl text-ink">{calories}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} className="h-9 w-9 items-center justify-center rounded-full bg-berry-pale" onPress={onRemove}>
        <Text className="font-bold text-base text-berry">×</Text>
      </Pressable>
    </View>
  );
}
