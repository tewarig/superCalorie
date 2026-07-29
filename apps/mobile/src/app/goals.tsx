import {
  MACRO_KEYS,
  MACRO_LABELS,
  MACRO_PRESETS,
  adjustSplit,
  macroTargets,
  splitTotal,
  type MacroKey,
} from "@supercalorie/core";
import { AppButton } from "@supercalorie/ui/app-button";
import { SectionHeading } from "@supercalorie/ui/section-heading";
import { Surface } from "@supercalorie/ui/surface";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { useTracker } from "@/lib/use-tracker";

/** Ring colours, matching the Summary screen so a macro reads the same everywhere. */
const MACRO_COLORS: Record<MacroKey, string> = {
  protein: colors.berry,
  carbs: colors.grain,
  fat: colors.moss,
};

/** How far one tap moves a macro. Ten is the granularity people think in. */
const STEP = 5;

function MacroRow({
  macroKey,
  percent,
  grams,
  onChange,
}: {
  macroKey: MacroKey;
  percent: number;
  grams: number;
  onChange: (percent: number) => void;
}) {
  const color = MACRO_COLORS[macroKey];

  return (
    <View className="border-t border-line py-4">
      <View className="flex-row items-center gap-3">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <Text className="min-w-0 flex-1 font-bold text-base text-ink">
          {MACRO_LABELS[macroKey]}
        </Text>
        <Text className="font-display text-xl" style={{ color }}>
          {percent}%
        </Text>
        <Text className="w-16 text-right font-body text-sm text-muted">{grams} g</Text>
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={`Decrease ${MACRO_LABELS[macroKey]}`}
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-moss-pale"
          onPress={() => onChange(percent - STEP)}
        >
          <Text className="font-bold text-base text-moss">−</Text>
        </Pressable>

        {/* The bar is the readout, not a control: dragging a true slider needs
            a gesture handler per row, and two taps is precise enough for a
            number that moves in fives. */}
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <View
            className="h-full rounded-full"
            style={{ backgroundColor: color, width: `${percent}%` }}
          />
        </View>

        <Pressable
          accessibilityLabel={`Increase ${MACRO_LABELS[macroKey]}`}
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-moss-pale"
          onPress={() => onChange(percent + STEP)}
        >
          <Text className="font-bold text-base text-moss">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const { profile, setGoal, setMacroSplit, ready } = useTracker();
  const [goalText, setGoalText] = useState<string | null>(null);

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.moss} />
      </SafeAreaView>
    );
  }

  const split = profile.macroSplit;
  const targets = macroTargets(profile.dailyCalorieGoal, split);
  const activePreset = MACRO_PRESETS.find(
    (preset) => MACRO_KEYS.every((key) => preset.split[key] === split[key]),
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2" keyboardShouldPersistTaps="handled">
        <View>
          <Text className="font-bold text-[11px] uppercase tracking-[2px] text-muted">
            What you are aiming for
          </Text>
          <Text className="mt-1 font-display text-4xl text-ink">Goals</Text>
        </View>

        <SectionHeading detail="Per day" title="Calories" />
        <Surface className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-base text-ink">Daily target</Text>
            <Text className="mt-0.5 font-body text-xs text-muted">
              Everything below is a share of this.
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Daily calorie target"
            className="min-w-24 rounded-control bg-moss-pale px-3 py-2 text-right font-bold text-base text-moss"
            keyboardType="number-pad"
            // Held as text while editing so the field can be cleared; an
            // empty box parsed as 0 would clamp the goal out from under you
            // mid-keystroke.
            onBlur={() => setGoalText(null)}
            onChangeText={(text) => {
              setGoalText(text);
              const next = Number(text.replace(/[^0-9]/g, ""));
              if (Number.isFinite(next) && next > 0) setGoal(next);
            }}
            value={goalText ?? String(profile.dailyCalorieGoal)}
          />
        </Surface>

        <SectionHeading
          detail={activePreset ? activePreset.name : "Custom"}
          title="Macro split"
        />

        <View className="flex-row flex-wrap gap-2">
          {MACRO_PRESETS.map((preset) => {
            const active = activePreset?.name === preset.name;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                className={`rounded-full px-4 py-2.5 ${active ? "bg-moss" : "border border-line bg-paper"}`}
                key={preset.name}
                onPress={() => setMacroSplit(preset.split)}
              >
                <Text className={`font-bold text-xs ${active ? "text-paper" : "text-muted"}`}>
                  {preset.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Surface className="pt-0">
          {MACRO_KEYS.map((key) => (
            <MacroRow
              grams={targets[key]}
              key={key}
              macroKey={key}
              onChange={(percent) => setMacroSplit(adjustSplit(split, key, percent))}
              percent={split[key]}
            />
          ))}

          <View className="flex-row items-center justify-between border-t border-line pt-4">
            <Text className="font-bold text-xs uppercase tracking-wider text-muted">Total</Text>
            {/* Always 100 by construction — adjustSplit takes the difference
                from the other two. Shown so the arithmetic is visible rather
                than something you have to trust. */}
            <Text className="font-display text-lg text-ink">{splitTotal(split)}%</Text>
          </View>
        </Surface>

        <Surface>
          <Text className="font-bold text-base text-ink">
            {targets.protein} g protein · {targets.carbs} g carbs · {targets.fat} g fat
          </Text>
          <Text className="mt-1 font-body text-xs text-muted">
            Grams are worked out from the split at 4, 4 and 9 kcal per gram, so they always add
            back up to your calorie target.
          </Text>
          {activePreset ? null : (
            <View className="mt-4">
              <AppButton
                size="sm"
                tone="quiet"
                onPress={() => setMacroSplit(MACRO_PRESETS[0].split)}
              >
                Reset to balanced
              </AppButton>
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
