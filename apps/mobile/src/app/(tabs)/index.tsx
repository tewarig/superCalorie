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
import { colors } from "@/lib/theme";
import { useTracker } from "@/lib/use-tracker";

/** Ring colours, outermost first: calories, then the three macros. */
const RING_COLORS = {
  calories: colors.citrus,
  protein: colors.berry,
  carbs: colors.grain,
  fat: colors.moss,
} as const;

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
        <ActivityIndicator color={colors.moss} />
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
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
        <View>
          <Text className="font-bold text-[11px] uppercase tracking-[2px] text-muted">
            {formatDateLabel(today)}
          </Text>
          <Text className="mt-1 font-display text-4xl text-ink">Summary</Text>
        </View>

        <View className="overflow-hidden rounded-card bg-ink p-6">
          <Text className="font-bold text-xs uppercase tracking-[3px] text-dial-muted">
            Today&apos;s fuel
          </Text>

          <View className="mt-5 flex-row items-center gap-6">
            <ActivityRings rings={allRings} size={150} strokeWidth={14} />

            <View className="min-w-0 flex-1 gap-3">
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
            <Surface className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-base text-ink">Goals</Text>
                <Text className="mt-0.5 font-body text-xs text-muted">
                  {day.goal} kcal · {profile.macroSplit.protein}/{profile.macroSplit.carbs}/
                  {profile.macroSplit.fat} split
                </Text>
              </View>
              <Text className="font-display text-2xl text-moss">›</Text>
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
            <View className="gap-3 py-2">
              <Text className="font-body text-sm text-muted">
                Nothing logged yet today.
              </Text>
              <Link className="font-bold text-sm text-moss" href="/log">
                Log your first meal →
              </Link>
            </View>
          ) : (
            <View className="gap-1">
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
