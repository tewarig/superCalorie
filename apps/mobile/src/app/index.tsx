import { Button } from "@supercalorie/ui/button";
import { color, fontSize, nutrition, radius, space } from "@supercalorie/ui/tokens";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Entry {
  name: string;
  calories: number;
  meal: string;
}

const GOAL = 2000;

const STARTER_ENTRIES: Entry[] = [
  { name: "Oats, berries & honey", calories: 340, meal: "Breakfast" },
  { name: "Chicken burrito bowl", calories: 620, meal: "Lunch" },
];

const QUICK_ADDS: Entry[] = [
  { name: "Greek yogurt", calories: 120, meal: "Snack" },
  { name: "Banana", calories: 105, meal: "Snack" },
  { name: "Paneer wrap", calories: 410, meal: "Dinner" },
];

const MACROS = [
  { label: "Protein", grams: 82, colorValue: nutrition.protein },
  { label: "Carbs", grams: 148, colorValue: nutrition.carbs },
  { label: "Fat", grams: 44, colorValue: nutrition.fat },
];

export default function TodayScreen() {
  const [entries, setEntries] = useState(STARTER_ENTRIES);

  const eaten = useMemo(() => entries.reduce((sum, e) => sum + e.calories, 0), [entries]);
  const progress = Math.min(eaten / GOAL, 1);
  const remaining = Math.max(GOAL - eaten, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.title}>
          super<Text style={{ color: color.accent }}>Calorie</Text>
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.kcalBig}>{eaten}</Text>
            <Text style={styles.kcalGoal}>/ {GOAL} kcal</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.remaining}>
            {remaining > 0 ? `${remaining} kcal remaining` : "Daily goal reached 🎉"}
          </Text>

          <View style={styles.macroRow}>
            {MACROS.map((macro) => (
              <View key={macro.label} style={styles.macroChip}>
                <View style={[styles.macroDot, { backgroundColor: macro.colorValue }]} />
                <Text style={styles.macroLabel}>
                  {macro.label} {macro.grams}g
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Meals</Text>
        <View style={styles.card}>
          {entries.map((entry, index) => (
            <View
              key={`${entry.name}-${index}`}
              style={[styles.mealRow, index > 0 && styles.mealRowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{entry.name}</Text>
                <Text style={styles.mealMeta}>{entry.meal}</Text>
              </View>
              <Text style={styles.mealKcal}>{entry.calories}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick add</Text>
        <View style={styles.quickAddRow}>
          {QUICK_ADDS.map((item) => (
            <Button
              key={item.name}
              size="sm"
              variant="outline"
              onPress={() => setEntries((prev) => [...prev, item])}
            >
              {`${item.name} · ${item.calories}`}
            </Button>
          ))}
        </View>

        <View style={styles.actions}>
          <Button fullWidth size="lg" variant="accent" onPress={() => {}}>
            Log a meal
          </Button>
          {entries.length > STARTER_ENTRIES.length && (
            <Button fullWidth variant="ghost" onPress={() => setEntries(STARTER_ENTRIES)}>
              Reset demo data
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  scroll: {
    padding: space.xl,
    paddingBottom: space.xxxl,
  },
  eyebrow: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: color.textFaint,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: "700",
    color: color.text,
    marginTop: space.xs,
    marginBottom: space.xl,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  kcalBig: {
    fontSize: fontSize.display,
    fontWeight: "700",
    color: color.text,
  },
  kcalGoal: {
    fontSize: fontSize.md,
    color: color.textFaint,
    fontWeight: "500",
  },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceMuted,
    marginTop: space.lg,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: nutrition.calories,
  },
  remaining: {
    marginTop: space.md,
    fontSize: fontSize.md,
    color: color.textMuted,
    fontWeight: "500",
  },
  macroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.lg,
  },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.pill,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: color.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: color.text,
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
  },
  mealRowBorder: {
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  mealName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: color.text,
  },
  mealMeta: {
    fontSize: fontSize.xs,
    color: color.textFaint,
    marginTop: 2,
  },
  mealKcal: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: color.text,
    fontVariant: ["tabular-nums"],
  },
  quickAddRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  actions: {
    marginTop: space.xxl,
    gap: space.md,
  },
});
