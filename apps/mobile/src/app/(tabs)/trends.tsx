import {
  buildHeatmap,
  currentStreak,
  lifetimeTotals,
  summariseDay,
  todayISO,
  topFoods,
} from "@supercalorie/core";
import { BarChart } from "@supercalorie/ui/bar-chart";
import { Heatmap } from "@supercalorie/ui/heatmap";
import { SectionHeading } from "@supercalorie/ui/section-heading";
import { Surface } from "@supercalorie/ui/surface";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { useTracker } from "@/lib/use-tracker";

/** The last `count` days ending today, oldest first. */
function recentDays(today: string, count: number): string[] {
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) =>
    todayISO(new Date(year, month - 1, day - (count - 1) + index)),
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="font-bold text-[11px] uppercase tracking-wider text-muted">{label}</Text>
      <Text className="mt-1 font-display text-2xl text-ink">{value}</Text>
    </View>
  );
}

export default function TrendsScreen() {
  const today = todayISO();
  const { snapshot, profile, ready } = useTracker(today);

  const stats = useMemo(() => {
    if (!ready) return null;
    const entries = snapshot.entries;
    return {
      fortnight: recentDays(today, 14).map((date) => ({
        key: date,
        // Only every other column is captioned, or the axis is unreadable.
        label: date.endsWith("1") || date.endsWith("5") ? date.slice(8) : "",
        value: summariseDay(entries, date, profile.dailyCalorieGoal).totals.calories,
      })),
      heatmap: buildHeatmap(entries, profile.dailyCalorieGoal, 365, today),
      streak: currentStreak(entries, today),
      lifetime: lifetimeTotals(entries, today),
      top: topFoods(entries, 10),
    };
  }, [ready, snapshot.entries, profile.dailyCalorieGoal, today]);

  if (!ready || !stats) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.moss} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
        <View>
          <Text className="font-bold text-[11px] uppercase tracking-[2px] text-muted">
            All your data
          </Text>
          <Text className="mt-1 font-display text-4xl text-ink">Trends</Text>
        </View>

        <Surface className="flex-row gap-3">
          <Stat label="Streak" value={`${stats.streak}d`} />
          <Stat label="Days logged" value={String(stats.lifetime.days)} />
          <Stat label="Entries" value={String(stats.lifetime.entries)} />
        </Surface>

        <SectionHeading detail="Last 14 days" title="Calories" />
        <Surface>
          <BarChart data={stats.fortnight} goal={profile.dailyCalorieGoal} />
        </Surface>

        <SectionHeading detail="A year" title="History" />
        <Surface>
          {stats.lifetime.days === 0 ? (
            <Text className="py-2 font-body text-sm text-muted">
              Log a few meals and a year of history builds up here.
            </Text>
          ) : (
            <Heatmap days={stats.heatmap} />
          )}
        </Surface>

        <SectionHeading detail="Most logged" title="Top foods" />
        <Surface>
          {stats.top.length === 0 ? (
            <Text className="py-2 font-body text-sm text-muted">Nothing logged yet.</Text>
          ) : (
            stats.top.map((food, index) => (
              <View
                className={`flex-row items-center gap-3 py-3 ${index > 0 ? "border-t border-line" : ""}`}
                key={food.name}
              >
                <Text className="w-6 font-display text-lg text-muted">{index + 1}</Text>
                <Text className="min-w-0 flex-1 font-bold text-base text-ink" numberOfLines={1}>
                  {food.name}
                </Text>
                <Text className="font-body text-xs text-muted">×{food.count}</Text>
              </View>
            ))
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
