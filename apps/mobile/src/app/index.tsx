import {
  MEAL_LABELS,
  MEAL_TYPES,
  SOURCE_LABELS,
  defaultMealForHour,
  formatDateLabel,
  macroTargets,
  mostLoggedFoods,
  searchFoods,
  todayISO,
  type Food,
  type MealType,
} from "@supercalorie/core";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@supercalorie/ui/app-button";
import { CalorieDial } from "@supercalorie/ui/calorie-dial";
import { FoodResultRow, LoggedFoodRow } from "@supercalorie/ui/food-row";
import { SectionHeading } from "@supercalorie/ui/section-heading";
import { SegmentedControl } from "@supercalorie/ui/segmented-control";
import { Surface } from "@supercalorie/ui/surface";
import { photoUri } from "@/lib/local-store";
import { pickPhoto, takePhoto, type PickedPhoto } from "@/lib/photo";
import { useTracker } from "@/lib/use-tracker";

const MACROS = [
  { key: "protein", label: "Protein", tone: "bg-berry", text: "text-berry" },
  { key: "carbs", label: "Carbs", tone: "bg-grain", text: "text-grain" },
  { key: "fat", label: "Fat", tone: "bg-moss", text: "text-moss" },
] as const;

function shiftDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return todayISO(new Date(year, month - 1, day + days));
}

export default function TodayScreen() {
  const [date, setDate] = useState(todayISO());
  const tracker = useTracker(date);
  const { day, profile } = tracker;
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState<MealType>(() => defaultMealForHour(new Date().getHours()));
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);

  const results = useMemo(
    () => query.trim() ? searchFoods(query, tracker.snapshot.customFoods, 12) : mostLoggedFoods(tracker.snapshot.entries, tracker.snapshot.customFoods),
    [query, tracker.snapshot],
  );

  if (!tracker.ready) {
    return <SafeAreaView className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color="#285B43" /></SafeAreaView>;
  }

  const targets = macroTargets(day.goal);

  function log(food: Food, quantity: number) {
    tracker.logFood(food, quantity, meal, photo);
    setQuery("");
    setPhoto(null);
  }

  async function attachPhoto(from: "camera" | "library") {
    const picked = from === "camera" ? await takePhoto() : await pickPhoto();
    if (picked) setPhoto(picked);
    else if (from === "camera") Alert.alert("Camera unavailable", "Allow camera access in Settings, or choose a photo.");
  }

  async function shareExport(format: "json" | "csv") {
    try {
      const uri = tracker.exportFile(format);
      await Share.share({ url: uri, message: `superCalorie export (${format.toUpperCase()})` });
    } catch (cause) {
      Alert.alert("Export failed", cause instanceof Error ? cause.message : "Try again.");
    }
  }

  async function runImport() {
    try {
      const result = await tracker.importFile();
      if (!result) return;
      Alert.alert("Import complete", result.added === 0 ? `Nothing new — all ${result.skipped} entries were already here.` : `Added ${result.added} ${result.added === 1 ? "entry" : "entries"}.`);
    } catch (cause) {
      Alert.alert("Import failed", cause instanceof Error ? cause.message : "Unreadable file.");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-14 pt-3" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Previous day" className="h-11 w-11 items-center justify-center rounded-full bg-moss-pale" hitSlop={8} onPress={() => setDate(shiftDate(date, -1))}><Text className="font-display text-2xl text-moss">‹</Text></Pressable>
          <View className="items-center"><Text className="font-bold text-[11px] uppercase tracking-[2px] text-muted">Food journal</Text><Text className="mt-1 font-display text-xl text-ink">{formatDateLabel(date)}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next day" className={`h-11 w-11 items-center justify-center rounded-full ${date === todayISO() ? "bg-line" : "bg-moss-pale"}`} disabled={date === todayISO()} hitSlop={8} onPress={() => setDate(shiftDate(date, 1))}><Text className={`font-display text-2xl ${date === todayISO() ? "text-muted opacity-40" : "text-moss"}`}>›</Text></Pressable>
        </View>

        <CalorieDial eaten={day.totals.calories} goal={day.goal} />

        <View className="flex-row gap-2">
          {MACROS.map((macro) => <View key={macro.key} className="flex-1 rounded-control border border-line bg-paper p-3"><View className={`h-2 w-2 rounded-full ${macro.tone}`} /><Text className="mt-3 font-bold text-xs text-muted">{macro.label}</Text><Text className={`mt-1 font-display text-lg ${macro.text}`}>{day.totals[macro.key]}/{targets[macro.key]}g</Text></View>)}
        </View>

        <Surface className="flex-row items-center justify-between px-5 py-4">
          <View><Text className="font-bold text-sm text-ink">Daily target</Text><Text className="mt-0.5 font-body text-xs text-muted">Change this whenever your plan changes.</Text></View>
          <TextInput accessibilityLabel="Daily calorie target" className="min-w-20 rounded-control bg-moss-pale px-3 py-2 text-right font-bold text-base text-moss" keyboardType="number-pad" onChangeText={(text) => { const next = Number(text.replace(/[^0-9]/g, "")); if (Number.isFinite(next) && next > 0) tracker.setGoal(next); }} value={String(profile.dailyCalorieGoal)} />
        </Surface>

        <SectionHeading title="Log a meal" detail={MEAL_LABELS[meal]} />
        <SegmentedControl options={MEAL_TYPES.map((type) => ({ label: MEAL_LABELS[type], value: type }))} value={meal} onChange={setMeal} />
        <TextInput accessibilityLabel="Search foods" autoCorrect={false} className="rounded-card border border-line bg-paper px-5 py-4 font-body text-base text-ink" onChangeText={setQuery} placeholder="Search dal, banana, paneer…" placeholderTextColor="#63746B" value={query} />

        <View className="flex-row flex-wrap items-center gap-2">
          <AppButton size="sm" tone="secondary" onPress={() => attachPhoto("camera")}>Take photo</AppButton>
          <AppButton size="sm" tone="quiet" onPress={() => attachPhoto("library")}>Choose photo</AppButton>
          {photo ? <View className="flex-row items-center gap-2"><Image className="h-10 w-10 rounded-control border border-line" source={{ uri: photo.uri }} /><Pressable accessibilityRole="button" onPress={() => setPhoto(null)}><Text className="font-bold text-xs text-berry">Remove</Text></Pressable></View> : null}
        </View>

        <Surface>
          <Text className="font-bold text-xs uppercase tracking-[2px] text-muted">{query.trim() ? `Matches for “${query.trim()}”` : "Your usuals"}</Text>
          {results.length === 0 ? <Text className="py-5 font-body text-sm text-muted">No matches. Try a different food name.</Text> : results.slice(0, 8).map((food, index) => <FoodResultRow key={food.id} divider={index > 0} meta={`${food.servingLabel} · ${food.calories} kcal`} name={food.name} source={SOURCE_LABELS[food.source]} onAdd={() => log(food, 1)} onHalf={() => log(food, 0.5)} />)}
        </Surface>

        {MEAL_TYPES.map((type) => {
          const items = day.entries.filter((entry) => entry.meal === type);
          const total = items.reduce((sum, entry) => sum + entry.calories, 0);
          return <View key={type} className="gap-2"><SectionHeading detail={`${total} kcal`} title={MEAL_LABELS[type]} /><Surface>{items.length === 0 ? <Text className="py-2 font-body text-sm text-muted">Nothing logged yet.</Text> : items.map((entry, index) => { const [photoId, extension] = (entry.photoId ?? "").split("."); return <LoggedFoodRow key={entry.id} calories={entry.calories} divider={index > 0} meta={entry.quantity === 1 ? entry.servingLabel : `${entry.quantity} × ${entry.servingLabel}`} name={entry.name} photoUri={entry.photoId ? photoUri(photoId, extension ?? "jpg") : null} onRemove={() => tracker.removeEntry(entry.id)} />; })}</Surface></View>;
        })}

        <SectionHeading title="Your data" />
        <Surface className="bg-moss-pale"><Text className="font-body text-sm leading-5 text-moss-deep">Your journal stays on this device. Export a copy before moving devices, or import a previous superCalorie export.</Text><View className="mt-4 flex-row flex-wrap gap-2"><AppButton size="sm" onPress={() => shareExport("json")}>Export JSON</AppButton><AppButton size="sm" tone="secondary" onPress={() => shareExport("csv")}>Export CSV</AppButton><AppButton size="sm" tone="quiet" onPress={runImport}>Import file</AppButton></View></Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
