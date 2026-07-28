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
import { Button } from "@supercalorie/ui/button";
import { color, fontSize, nutrition, radius, space } from "@supercalorie/ui/tokens";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { photoUri } from "@/lib/local-store";
import { pickPhoto, takePhoto, type PickedPhoto } from "@/lib/photo";
import { useTracker } from "@/lib/use-tracker";

const MACROS = [
  { key: "protein", label: "Protein", tint: nutrition.protein },
  { key: "carbs", label: "Carbs", tint: nutrition.carbs },
  { key: "fat", label: "Fat", tint: nutrition.fat },
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
    () =>
      query.trim()
        ? searchFoods(query, tracker.snapshot.customFoods, 12)
        : mostLoggedFoods(tracker.snapshot.entries, tracker.snapshot.customFoods),
    [query, tracker.snapshot],
  );

  if (!tracker.ready) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator color={color.primary} />
      </SafeAreaView>
    );
  }

  const targets = macroTargets(day.goal);
  const eaten = day.totals.calories;
  const over = eaten > day.goal;
  const progress = day.goal > 0 ? Math.min(eaten / day.goal, 1) : 0;

  function log(food: Food, quantity: number) {
    tracker.logFood(food, quantity, meal, photo);
    setQuery("");
    setPhoto(null);
  }

  async function attachPhoto(from: "camera" | "library") {
    const picked = from === "camera" ? await takePhoto() : await pickPhoto();
    if (picked) setPhoto(picked);
    else if (from === "camera") {
      Alert.alert("Camera unavailable", "Allow camera access in Settings, or choose a photo.");
    }
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
      Alert.alert(
        "Import complete",
        result.added === 0
          ? `Nothing new — all ${result.skipped} entries were already here.`
          : `Added ${result.added} ${result.added === 1 ? "entry" : "entries"}.`,
      );
    } catch (cause) {
      Alert.alert("Import failed", cause instanceof Error ? cause.message : "Unreadable file.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.dateRow}>
          <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={10}>
            <Text style={styles.arrow}>←</Text>
          </Pressable>
          <Text style={styles.eyebrow}>{formatDateLabel(date)}</Text>
          <Pressable
            onPress={() => date !== todayISO() && setDate(shiftDate(date, 1))}
            hitSlop={10}
          >
            <Text style={[styles.arrow, date === todayISO() && styles.arrowDisabled]}>→</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.kcalRow}>
            <Text style={styles.kcalBig}>{eaten}</Text>
            <Text style={styles.kcalGoal}>/ {day.goal} kcal</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: over ? "#A63D57" : nutrition.calories,
                },
              ]}
            />
          </View>
          <Text style={styles.remaining}>
            {over ? `${eaten - day.goal} kcal over goal` : `${day.remaining} kcal remaining`}
          </Text>

          <View style={styles.macroRow}>
            {MACROS.map((macro) => (
              <View key={macro.key} style={styles.macroChip}>
                <View style={[styles.macroDot, { backgroundColor: macro.tint }]} />
                <Text style={styles.macroLabel}>
                  {macro.label} {day.totals[macro.key]}/{targets[macro.key]}g
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Daily goal</Text>
            <TextInput
              value={String(profile.dailyCalorieGoal)}
              onChangeText={(text) => {
                const next = Number(text.replace(/[^0-9]/g, ""));
                if (Number.isFinite(next) && next > 0) tracker.setGoal(next);
              }}
              keyboardType="number-pad"
              style={styles.goalInput}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Log food</Text>
        <View style={styles.mealTabs}>
          {MEAL_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setMeal(type)}
              style={[styles.mealTab, meal === type && styles.mealTabActive]}
            >
              <Text style={[styles.mealTabText, meal === type && styles.mealTabTextActive]}>
                {MEAL_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods — “dal”, “banana”, “paneer”…"
          placeholderTextColor={color.textFaint}
          autoCorrect={false}
          style={styles.search}
        />

        <View style={styles.photoRow}>
          <Button size="sm" variant="outline" onPress={() => attachPhoto("camera")}>
            Take photo
          </Button>
          <Button size="sm" variant="ghost" onPress={() => attachPhoto("library")}>
            Choose
          </Button>
          {photo && (
            <View style={styles.photoPreviewRow}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <Pressable onPress={() => setPhoto(null)} hitSlop={8}>
                <Text style={styles.removePhoto}>Remove</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.resultsLabel}>
            {query.trim() ? `Results for “${query.trim()}”` : "Your usuals"}
          </Text>
          {results.length === 0 ? (
            <Text style={styles.empty}>No matches.</Text>
          ) : (
            results.slice(0, 8).map((food, index) => (
              <View key={food.id} style={[styles.foodRow, index > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text style={styles.foodMeta}>
                    <Text style={styles.sourceBadge}>{SOURCE_LABELS[food.source]}</Text>
                    {"  "}
                    {food.servingLabel} · {food.calories} kcal
                  </Text>
                </View>
                <Button size="sm" variant="ghost" onPress={() => log(food, 0.5)}>
                  ½
                </Button>
                <Button size="sm" onPress={() => log(food, 1)}>
                  Add
                </Button>
              </View>
            ))
          )}
        </View>

        {MEAL_TYPES.map((type) => {
          const items = day.entries.filter((entry) => entry.meal === type);
          const total = items.reduce((sum, entry) => sum + entry.calories, 0);

          return (
            <View key={type}>
              <View style={styles.mealHeader}>
                <Text style={styles.sectionTitle}>{MEAL_LABELS[type]}</Text>
                <Text style={styles.mealTotal}>{total} kcal</Text>
              </View>
              <View style={styles.card}>
                {items.length === 0 ? (
                  <Text style={styles.empty}>Nothing yet.</Text>
                ) : (
                  items.map((entry, index) => {
                    const [photoId, extension] = (entry.photoId ?? "").split(".");
                    const uri = entry.photoId ? photoUri(photoId, extension ?? "jpg") : null;

                    return (
                      <View key={entry.id} style={[styles.foodRow, index > 0 && styles.rowBorder]}>
                        {uri && <Image source={{ uri }} style={styles.entryThumb} />}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodName} numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <Text style={styles.foodMeta}>
                            {entry.quantity === 1
                              ? entry.servingLabel
                              : `${entry.quantity} × ${entry.servingLabel}`}
                          </Text>
                        </View>
                        <Text style={styles.entryKcal}>{entry.calories}</Text>
                        <Pressable onPress={() => tracker.removeEntry(entry.id)} hitSlop={10}>
                          <Text style={styles.removeIcon}>✕</Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Your data</Text>
        <View style={styles.card}>
          <Text style={styles.dataNote}>
            Everything is stored on this device. Export to keep a backup or move to another one.
          </Text>
          <View style={styles.dataButtons}>
            <Button size="sm" onPress={() => shareExport("json")}>
              Export JSON
            </Button>
            <Button size="sm" variant="outline" onPress={() => shareExport("csv")}>
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onPress={runImport}>
              Import…
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background },
  centered: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: space.xl, paddingBottom: space.xxxl, gap: space.md },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { fontSize: fontSize.xl, color: color.textMuted, paddingHorizontal: space.sm },
  arrowDisabled: { opacity: 0.25 },
  eyebrow: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: color.textFaint,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
  },
  kcalRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  kcalBig: { fontSize: fontSize.display, fontWeight: "700", color: color.text },
  kcalGoal: { fontSize: fontSize.md, color: color.textFaint, fontWeight: "500" },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceMuted,
    marginTop: space.md,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
  remaining: {
    marginTop: space.md,
    fontSize: fontSize.md,
    color: color.textMuted,
    fontWeight: "500",
  },
  macroRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.lg },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.pill,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: fontSize.xs, fontWeight: "600", color: color.textMuted },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  goalLabel: { fontSize: fontSize.sm, fontWeight: "600", color: color.textMuted },
  goalInput: {
    minWidth: 90,
    textAlign: "right",
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    color: color.text,
    fontSize: fontSize.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: color.text,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  mealTabs: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  mealTab: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceMuted,
  },
  mealTabActive: { backgroundColor: color.primary },
  mealTabText: { fontSize: fontSize.xs, fontWeight: "600", color: color.textMuted },
  mealTabTextActive: { color: color.textOnDark },
  search: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    fontSize: fontSize.md,
    color: color.text,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.sm,
    marginVertical: space.sm,
  },
  photoPreviewRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  photoPreview: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  removePhoto: { fontSize: fontSize.xs, fontWeight: "600", color: color.textFaint },
  resultsLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: color.textFaint,
    marginBottom: space.sm,
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: color.border },
  foodName: { fontSize: fontSize.md, fontWeight: "600", color: color.text },
  foodMeta: { fontSize: fontSize.xs, color: color.textFaint, marginTop: 2 },
  sourceBadge: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: color.primary,
    textTransform: "uppercase",
  },
  entryThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  entryKcal: { fontSize: fontSize.md, fontWeight: "700", color: color.text },
  removeIcon: { fontSize: fontSize.md, color: color.textFaint, paddingHorizontal: space.xs },
  mealHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  mealTotal: { fontSize: fontSize.sm, fontWeight: "600", color: color.textMuted },
  empty: { fontSize: fontSize.sm, color: color.textFaint, paddingVertical: space.sm },
  dataNote: { fontSize: fontSize.sm, color: color.textMuted, marginBottom: space.md },
  dataButtons: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
