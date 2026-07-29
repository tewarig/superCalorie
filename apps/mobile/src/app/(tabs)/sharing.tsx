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
import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearConnection, getConnection, subscribeToConnection } from "@/lib/local-store";
import { apiClient, getSession, signOut, subscribeToSession } from "@/lib/session";
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
  const [handle, setHandle] = useState("");
  const [claimed, setClaimed] = useState(false);
  const [saving, setSaving] = useState(false);
  const connection = useSyncExternalStore(subscribeToConnection, getConnection, getConnection);
  const session = useSyncExternalStore(subscribeToSession, getSession, getSession);

  // The published profile, if there is one. Loaded rather than assumed, so
  // the toggles show what visitors actually see rather than a local guess.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    apiClient()
      .profile()
      .then(({ profile }) => {
        if (cancelled || !profile) return;
        setHandle(profile.handle);
        setClaimed(true);
        setVisibility({
          isPublic: profile.isPublic,
          showToday: profile.showToday,
          showTotals: profile.showTotals,
          showHeatmap: profile.showHeatmap,
          showTopFoods: profile.showTopFoods,
          showRecent: profile.showRecent,
        });
      })
      .catch(() => {
        // No profile yet, or the server is unreachable. Neither is worth an
        // alert on a screen the user may only be browsing.
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const publish = useCallback(
    async (next: ProfileVisibility, nextHandle: string) => {
      if (!session) return;
      setSaving(true);
      try {
        // Every flag every time: the endpoint reads them individually and
        // treats an omitted one as off, so a partial body would quietly
        // unpublish sections the user left alone.
        await apiClient().saveProfile({ handle: nextHandle, ...next });
        setClaimed(true);
      } catch (cause) {
        Alert.alert(
          "Could not save",
          cause instanceof Error ? cause.message : "Try again in a moment.",
        );
      } finally {
        setSaving(false);
      }
    },
    [session],
  );

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
          <Text className="font-bold text-base text-ink">
            {claimed && visibility.isPublic
              ? "Your page is live"
              : claimed
                ? "Claimed, nothing visible yet"
                : "Nothing is published"}
          </Text>
          <Text className="mt-1 font-body text-sm text-muted">
            {!session
              ? "Publishing needs an account on a server. Sign in below and you can claim a handle."
              : claimed
                ? `Your page is at /u/${handle}. Only the sections switched on below are visible.`
                : "Claim a handle and your page exists — still empty, because every section starts off."}
          </Text>

          {session ? (
            <View className="mt-4 gap-2">
              <TextInput
                accessibilityLabel="Handle"
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-control border border-line bg-canvas px-4 py-3 font-body text-base text-ink"
                // A handle is part of a public URL others may already have
                // linked to, so changing it is not a casual edit.
                editable={!claimed}
                onChangeText={setHandle}
                placeholder="your-handle"
                placeholderTextColor={colors.muted}
                value={handle}
              />
              <Text className="font-body text-xs text-muted">
                Lowercase letters, numbers and single dashes.
              </Text>
              <View className="flex-row items-center gap-2">
                <AppButton
                  disabled={handle.trim() === "" || saving}
                  size="sm"
                  onPress={() => void publish(visibility, handle.trim())}
                >
                  {claimed ? "Save" : "Claim it"}
                </AppButton>
                {saving ? <ActivityIndicator color={colors.moss} /> : null}
              </View>
            </View>
          ) : null}

          <View className="mt-4 flex-row flex-wrap gap-2">
            <AppButton size="sm" tone="quiet" onPress={clearConnection}>
              {connection?.mode === "local" ? "Connect a server" : "Change server"}
            </AppButton>
          </View>
        </Surface>

        <Surface className="gap-1">
          <Text className="font-bold text-base text-ink">
            {session ? `Signed in as ${session.user.email}` : "Not signed in"}
          </Text>
          <Text className="font-body text-sm text-muted">
            {session
              ? "Your log still lives on this device. The account is what lets it reach another one."
              : "Optional. The app works fully without an account — signing in is for syncing and publishing."}
          </Text>
          <View className="mt-3 flex-row gap-2">
            {session ? (
              <AppButton size="sm" tone="quiet" onPress={() => void signOut()}>
                Sign out
              </AppButton>
            ) : (
              <Link asChild href="/sign-in">
                <Pressable accessibilityRole="button">
                  <View className="min-h-10 items-center justify-center rounded-full bg-moss px-4">
                    <Text className="font-bold text-sm text-paper">Sign in</Text>
                  </View>
                </Pressable>
              </Link>
            )}
          </View>
        </Surface>

        {claimed ? (
          <Surface className="pt-0">
            {/* The master switch, kept apart from the section list: with this
                off the page 404s however many sections are on, which is the
                privacy guarantee the backend makes. */}
            <Toggle
              detail={
                visibility.isPublic
                  ? "Anyone with the link can see the sections below."
                  : "Your page returns 404, exactly like an unclaimed handle."
              }
              label="Page is public"
              on={visibility.isPublic}
              onPress={() => {
                const next = { ...visibility, isPublic: !visibility.isPublic };
                setVisibility(next);
                void publish(next, handle);
              }}
            />
          </Surface>
        ) : null}

        <SectionHeading detail={`${shown.length} of ${SECTIONS.length}`} title="What to show" />
        <Surface className="pt-0">
          {SECTIONS.map((section) => (
            <Toggle
              detail={section.detail}
              key={section.key}
              label={section.label}
              on={visibility[section.key]}
              onPress={() => {
                const next = { ...visibility, [section.key]: !visibility[section.key] };
                setVisibility(next);
                // Optimistic: the switch moves now and the request follows.
                // Waiting on a round trip to animate a toggle reads as broken.
                // A failure alerts, and the next load corrects the state.
                if (claimed) void publish(next, handle);
              }}
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
