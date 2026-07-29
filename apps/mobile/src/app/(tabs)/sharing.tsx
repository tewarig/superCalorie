import {
  buildPublicStats,
  currentStreak,
  lifetimeTotals,
  todayISO,
  topFoods,
  type ProfileVisibility,
} from "@supercalorie/core";
import { AppButton } from "@supercalorie/ui/app-button";
import { SectionHeading } from "@supercalorie/ui/section-heading";
import { Surface } from "@supercalorie/ui/surface";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { useTracker } from "@/lib/use-tracker";

const SECTIONS: { key: keyof ProfileVisibility; label: string; detail: string }[] = [
  { key: "showToday", label: "Today's calories", detail: "What you have eaten so far today" },
  { key: "showTotals", label: "Totals and streak", detail: "Days logged, entries, current streak" },
  { key: "showHeatmap", label: "History grid", detail: "A year of logging, day by day" },
  { key: "showTopFoods", label: "Top foods", detail: "The ten you log most" },
  { key: "showRecent", label: "Recent meals", detail: "Your latest entries, with dates" },
];

/** Everything off. Publishing is opt-in, one section at a time. */
const NOTHING_SHARED: ProfileVisibility = {
  isPublic: false,
  showToday: false,
  showTotals: false,
  showHeatmap: false,
  showTopFoods: false,
  showRecent: false,
};

function Toggle({
  label,
  detail,
  on,
  onPress,
}: {
  label: string;
  detail: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      className="flex-row items-center gap-3 border-t border-line py-4"
      onPress={onPress}
    >
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-base text-ink">{label}</Text>
        <Text className="mt-0.5 font-body text-xs text-muted">{detail}</Text>
      </View>
      <View
        className={`h-7 w-12 justify-center rounded-full px-1 ${on ? "bg-moss" : "bg-line"}`}
      >
        <View className={`h-5 w-5 rounded-full bg-paper ${on ? "self-end" : "self-start"}`} />
      </View>
    </Pressable>
  );
}

/**
 * Publishing controls, and a preview of exactly what a visitor would see.
 *
 * The preview is built with the same buildPublicStats the server uses, so it
 * cannot promise something the API would not actually return. Nothing here
 * leaves the device yet — the toggles describe a profile, and claiming a
 * handle needs a server, which a local-only install does not have.
 */
export default function SharingScreen() {
  const today = todayISO();
  const { snapshot, profile, ready } = useTracker(today);
  const [visibility, setVisibility] = useState<ProfileVisibility>(NOTHING_SHARED);

  const preview = useMemo(
    () => (ready ? buildPublicStats(snapshot.entries, profile.dailyCalorieGoal, visibility, today) : {}),
    [ready, snapshot.entries, profile.dailyCalorieGoal, visibility, today],
  );

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.moss} />
      </SafeAreaView>
    );
  }

  const shown = SECTIONS.filter((section) => visibility[section.key]);
  const streak = currentStreak(snapshot.entries, today);
  const lifetime = lifetimeTotals(snapshot.entries, today);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
        <View>
          <Text className="font-bold text-[11px] uppercase tracking-[2px] text-muted">
            Your public page
          </Text>
          <Text className="mt-1 font-display text-4xl text-ink">Sharing</Text>
        </View>

        <Surface>
          <Text className="font-bold text-base text-ink">Nothing is published</Text>
          <Text className="mt-1 font-body text-sm text-muted">
            Claiming a handle needs a server to publish to. Connect this app to the cloud
            instance or your own backend, and these settings become your page at /u/your-handle.
          </Text>
          <View className="mt-4">
            <AppButton disabled size="sm" tone="secondary">
              Claim a handle
            </AppButton>
          </View>
        </Surface>

        <SectionHeading detail={`${shown.length} of ${SECTIONS.length}`} title="What to show" />
        <Surface className="pt-0">
          {SECTIONS.map((section) => (
            <Toggle
              detail={section.detail}
              key={section.key}
              label={section.label}
              on={visibility[section.key]}
              onPress={() =>
                setVisibility((current) => ({ ...current, [section.key]: !current[section.key] }))
              }
            />
          ))}
        </Surface>

        <SectionHeading detail="What visitors see" title="Preview" />
        <Surface>
          {shown.length === 0 ? (
            <Text className="py-2 font-body text-sm text-muted">
              With everything off, your page would be a 404 — the same response an unclaimed
              handle gives, so nobody can tell you have an account at all.
            </Text>
          ) : (
            <View className="gap-3">
              {preview.today ? (
                <View>
                  <Text className="font-bold text-[11px] uppercase tracking-wider text-muted">
                    Today
                  </Text>
                  <Text className="font-display text-2xl text-ink">
                    {preview.today.calories}
                    <Text className="font-body text-sm text-muted">
                      {" "}
                      of {preview.today.goal} kcal
                    </Text>
                  </Text>
                </View>
              ) : null}
              {preview.totals ? (
                <Text className="font-body text-sm text-muted">
                  {lifetime.days} days logged · {lifetime.entries} entries · {streak} day streak
                </Text>
              ) : null}
              {preview.heatmap ? (
                <Text className="font-body text-sm text-muted">
                  A year of history, {preview.heatmap.length} days of it
                </Text>
              ) : null}
              {preview.topFoods ? (
                <Text className="font-body text-sm text-muted">
                  Top foods: {topFoods(snapshot.entries, 3).map((food) => food.name).join(", ") || "none yet"}
                </Text>
              ) : null}
              {preview.recent ? (
                <Text className="font-body text-sm text-muted">
                  Your {preview.recent.length} most recent meals, with dates
                </Text>
              ) : null}
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
