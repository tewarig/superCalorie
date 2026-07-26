import {
  MEAL_LABELS,
  MEAL_TYPES,
  SOURCE_LABELS,
  macroTargets,
  todayISO,
  type DaySummary,
  type Food,
  type MealType,
} from "@supercalorie/core";
import { Button } from "@supercalorie/ui/button";
import { color, fontSize, nutrition, radius, space } from "@supercalorie/ui/tokens";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, photoSource } from "@/lib/api";
import { pickPhoto, takePhoto, uploadPhoto, type PickedPhoto } from "@/lib/photo";
import { useSession } from "@/lib/session";

const MACROS = [
  { key: "protein", label: "Protein", tint: nutrition.protein },
  { key: "carbs", label: "Carbs", tint: nutrition.carbs },
  { key: "fat", label: "Fat", tint: nutrition.fat },
] as const;

export default function TodayScreen() {
  const { user, loading: sessionLoading, logout } = useSession();

  const [day, setDay] = useState<DaySummary | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [meal, setMeal] = useState<MealType>(defaultMealForNow);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setDay(await api.getDay(todayISO()));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the server.");
    }
  }, []);

  // Load on sign-in. Written inline rather than calling `refresh()` so the
  // fetch can be abandoned if the screen unmounts mid-flight.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getDay(todayISO());
        if (!cancelled) {
          setDay(data);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not reach the server.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Debounced search; an empty query returns the user's most-logged foods.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const data = await api.searchFoods(query.trim() || undefined);
          if (!cancelled) setResults(data.foods);
        } catch {
          if (!cancelled) setResults([]);
        }
      },
      query ? 200 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user, day]);

  if (sessionLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator color={color.primary} />
      </SafeAreaView>
    );
  }
  if (!user) return <Redirect href="/login" />;

  const eaten = day?.totals.calories ?? 0;
  const goal = day?.goal ?? user.dailyCalorieGoal;
  const progress = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = eaten > goal;
  const targets = macroTargets(goal);

  async function log(food: Food, quantity: number) {
    if (busy) return;
    setBusy(true);
    try {
      // Upload first — an entry may only reference a photo that already
      // exists, so a failed upload must not log a photo-less entry silently.
      const photoId = photo ? await uploadPhoto(photo) : undefined;
      await api.logEntry({ foodId: food.id, quantity, meal, date: todayISO(), photoId });
      setQuery("");
      setPhoto(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not log that.");
    } finally {
      setBusy(false);
    }
  }

  async function attachPhoto(from: "camera" | "library") {
    try {
      const picked = from === "camera" ? await takePhoto() : await pickPhoto();
      if (picked) setPhoto(picked);
      else if (from === "camera") {
        // launchCameraAsync also returns null when permission was refused,
        // which otherwise looks like the button doing nothing at all.
        Alert.alert(
          "Camera unavailable",
          "Allow camera access in Settings, or pick an existing photo instead.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open the camera.");
    }
  }

  async function remove(id: string) {
    setDay((current) =>
      current ? { ...current, entries: current.entries.filter((e) => e.id !== id) } : current,
    );
    await api.deleteEntry(id).catch(() => {});
    refresh();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
            tintColor={color.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Today</Text>
            <Text style={styles.greeting}>Hi, {user.name}</Text>
          </View>
          <Pressable onPress={logout} hitSlop={8}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.card}>
          <View style={styles.kcalRow}>
            <Text style={styles.kcalBig}>{eaten}</Text>
            <Text style={styles.kcalGoal}>/ {goal} kcal</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${progress * 100}%`, backgroundColor: over ? "#A63D57" : nutrition.calories },
              ]}
            />
          </View>
          <Text style={styles.remaining}>
            {over ? `${eaten - goal} kcal over goal` : `${goal - eaten} kcal remaining`}
          </Text>

          <View style={styles.macroRow}>
            {MACROS.map((macro) => (
              <View key={macro.key} style={styles.macroChip}>
                <View style={[styles.macroDot, { backgroundColor: macro.tint }]} />
                <Text style={styles.macroLabel}>
                  {macro.label} {day?.totals[macro.key] ?? 0}/{targets[macro.key]}g
                </Text>
              </View>
            ))}
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
        {photo && <Text style={styles.photoHint}>Attaches to the next food you add.</Text>}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods — “dal”, “banana”, “paneer”…"
          placeholderTextColor={color.textFaint}
          autoCorrect={false}
          style={styles.search}
        />

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
          const items = day?.entries.filter((entry) => entry.meal === type) ?? [];
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
                  items.map((entry, index) => (
                    <View key={entry.id} style={[styles.foodRow, index > 0 && styles.rowBorder]}>
                      {entry.photoId && (
                        <Image source={photoSource(entry.photoId)} style={styles.entryThumb} />
                      )}
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
                      <Pressable onPress={() => remove(entry.id)} hitSlop={10}>
                        <Text style={styles.removeIcon}>✕</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function defaultMealForNow(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background },
  centered: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: space.xl, paddingBottom: space.xxxl, gap: space.md },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: color.textFaint,
  },
  greeting: { fontSize: fontSize.xxl, fontWeight: "700", color: color.text, marginTop: 2 },
  logout: { fontSize: fontSize.sm, fontWeight: "600", color: color.textMuted, paddingTop: space.sm },
  error: {
    backgroundColor: "#FDECEA",
    color: "#8C2C1E",
    padding: space.md,
    borderRadius: radius.md,
    fontSize: fontSize.sm,
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
  remaining: { marginTop: space.md, fontSize: fontSize.md, color: color.textMuted, fontWeight: "500" },
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: color.text,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  mealTabs: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.md },
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
    marginBottom: space.md,
  },
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
  entryKcal: { fontSize: fontSize.md, fontWeight: "700", color: color.text },
  removeIcon: { fontSize: fontSize.md, color: color.textFaint, paddingHorizontal: space.xs },
  mealHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  mealTotal: { fontSize: fontSize.sm, fontWeight: "600", color: color.textMuted },
  empty: { fontSize: fontSize.sm, color: color.textFaint, paddingVertical: space.sm },
  photoRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm },
  photoPreviewRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  photoPreview: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  removePhoto: { fontSize: fontSize.xs, fontWeight: "600", color: color.textFaint },
  photoHint: {
    fontSize: fontSize.xs,
    color: color.textFaint,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  entryThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  sourceBadge: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: color.primary,
    textTransform: "uppercase",
  },
});
