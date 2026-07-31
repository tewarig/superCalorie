import {
  MACRO_KEYS,
  MACRO_LABELS,
  formatDateLabel,
  macroTargets,
  summariseDay,
  todayISO,
} from "@supercalorie/core";
import { ActivityRings } from "@supercalorie/ui/activity-rings";
import { BarChart } from "@supercalorie/ui/bar-chart";
import { SectionHeading } from "@supercalorie/ui/section-heading";
import { Surface } from "@supercalorie/ui/surface";
import { Link } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { macroColors, role } from "@/lib/theme";
import { useTracker } from "@/lib/use-tracker";

/** Ring colours, outermost first: calories, then the three macros. */
const RING_COLORS = macroColors;

/** Seven days ending today, oldest first. */
function lastSevenDays(today: string): string[] {
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: 7 }, (_, index) =>
    todayISO(new Date(year, month - 1, day - 6 + index)),
  );
}

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export default function SummaryScreen() {
  const today = todayISO();
  const tracker = useTracker(today);
  const { day, profile, snapshot, ready } = tracker;

  const targets = useMemo(
    () => macroTargets(day.goal, profile.macroSplit),
    [day.goal, profile.macroSplit],
  );

  const week = useMemo(() => {
    if (!ready) return [];
    return lastSevenDays(today).map((date) => {
      const summary = summariseDay(snapshot.entries, date, profile.dailyCalorieGoal);
      return {
        key: date,
        label: WEEKDAY_INITIALS[new Date(`${date}T00:00:00`).getDay()],
        value: summary.totals.calories,
      };
    });
  }, [ready, today, snapshot.entries, profile.dailyCalorieGoal]);

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={role.primary} />
      </SafeAreaView>
    );
  }

  const rings = MACRO_KEYS.map((key) => ({
    key,
    label: MACRO_LABELS[key],
    value: day.totals[key],
    target: targets[key],
    color: RING_COLORS[key],
  }));

  const allRings = [
    {
      key: "calories",
      label: "Calories",
      value: day.totals.calories,
      target: day.goal,
      color: RING_COLORS.calories,
    },
    ...rings,
  ];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "left", "right"]}>
      {/* Floats over the scroll rather than sitting in it, so logging is one
          tap from anywhere on the screen. Bottom right because that is where
          the thumb already rests one-handed — it sat top-left first, which put
          the app's most frequent action in the least reachable corner. Kept
          clear of the tab bar by the ScrollView's bottom padding below. */}
      <Link asChild href="/log">
        <Pressable
          accessibilityLabel="Log food"
          accessibilityRole="button"
          className="absolute bottom-gutter right-gutter z-10 h-fab w-fab items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Text className="font-display text-3xl text-paper">+</Text>
        </Pressable>
      </Link>

      {/* `pb-fab-clear` is the token for exactly this: enough room under a
          scroll that its last card is not stuck behind the floating button. */}
      <ScrollView contentContainerClassName="gap-lg px-gutter pb-fab-clear pt-sm">
        <View>
          <Text className="font-bold text-label uppercase tracking-label text-muted">
            {formatDateLabel(today)}
          </Text>
          <Text className="mt-xs font-display text-4xl text-ink">Summary</Text>
        </View>

        <View className="overflow-hidden rounded-card bg-ink p-xl">
          <Text className="font-bold text-xs uppercase tracking-eyebrow text-dial-muted">
            Today&apos;s fuel
          </Text>

          <View className="mt-lg flex-row items-center gap-xl">
            <ActivityRings rings={allRings} size={150} strokeWidth={14} />

            <View className="min-w-0 flex-1 gap-md">
              {allRings.map((ring) => (
                <View key={ring.key}>
                  <Text className="font-bold text-xs text-dial-muted">{ring.label}</Text>
                  <Text className="font-display text-xl" style={{ color: ring.color }}>
                    {ring.value}
                    <Text className="font-body text-xs text-dial-muted">
                      /{ring.target}
                      {ring.key === "calories" ? " kcal" : " g"}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Link asChild href="/goals">
          <Pressable accessibilityRole="button">
            <Surface className="flex-row items-center gap-md">
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-base text-ink">Goals</Text>
                <Text className="mt-xxs font-body text-xs text-muted">
                  {day.goal} kcal · {profile.macroSplit.protein}/{profile.macroSplit.carbs}/
                  {profile.macroSplit.fat} split
                </Text>
              </View>
              <Text className="font-display text-2xl text-primary">›</Text>
            </Surface>
          </Pressable>
        </Link>

        <SectionHeading detail="Last 7 days" title="Calories" />
        <Surface>
          <BarChart data={week} goal={day.goal} />
        </Surface>

        <SectionHeading detail={`${day.entries.length} today`} title="Logged" />
        <Surface>
          {day.entries.length === 0 ? (
            <View className="gap-md py-sm">
              <Text className="font-body text-sm text-muted">
                Nothing logged yet today.
              </Text>
              <Link className="font-bold text-sm text-primary" href="/log">
                Log your first meal →
              </Link>
            </View>
          ) : (
            <View className="gap-xs">
              <Text className="font-display text-3xl text-ink">
                {day.totals.calories}
                <Text className="font-body text-sm text-muted"> kcal</Text>
              </Text>
              <Text className="font-body text-sm text-muted">
                {day.remaining > 0
                  ? `${day.remaining} kcal left to log`
                  : `${day.totals.calories - day.goal} kcal over your goal`}
              </Text>
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
