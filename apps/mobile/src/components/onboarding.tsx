import { LOCAL_ONLY, serverUrlError, type Connection } from "@supercalorie/core";
import { AppButton } from "@supercalorie/ui/app-button";
import { Surface } from "@supercalorie/ui/surface";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { role } from "@/lib/theme";

/** The instance this build points at. Empty until one is published. */
const HOSTED_URL = process.env.EXPO_PUBLIC_HOSTED_URL ?? "";

function Choice({
  title,
  badge,
  detail,
  onPress,
}: {
  title: string;
  badge?: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Surface className="gap-xs">
        <View className="flex-row items-center gap-sm">
          <Text className="font-bold text-base text-ink">{title}</Text>
          {badge ? (
            <Text className="rounded-full bg-primary-soft px-sm py-xxs font-bold text-caption uppercase tracking-label text-primary">
              {badge}
            </Text>
          ) : null}
        </View>
        <Text className="font-body text-sm text-muted">{detail}</Text>
      </Surface>
    </Pressable>
  );
}

/**
 * First launch: how should this device store things?
 *
 * Local is listed first and needs no account, because that is the honest
 * default for a local-first app — the other two are opt-ins, not upgrades.
 * Nothing here touches the network; picking a server only records where to
 * talk to later.
 */
export function Onboarding({ onChoose }: { onChoose: (connection: Connection) => void }) {
  const [selfHosting, setSelfHosting] = useState(false);
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const error = touched ? serverUrlError(url) : null;

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="gap-lg px-gutter pb-xxxl pt-xxl" keyboardShouldPersistTaps="handled">
        <View>
          <Text className="font-display text-4xl text-ink">superCalorie</Text>
          <Text className="mt-sm font-body text-base text-muted">
            How would you like to use it?
          </Text>
        </View>

        {selfHosting ? (
          <Surface className="gap-md">
            <Text className="font-bold text-base text-ink">Your server</Text>
            <Text className="font-body text-sm text-muted">
              The address superCalorie is running at, including https://
            </Text>
            <TextInput
              accessibilityLabel="Server address"
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-control border border-line bg-canvas px-lg py-md font-body text-base text-ink"
              inputMode="url"
              onChangeText={(text) => {
                setUrl(text);
                setTouched(true);
              }}
              placeholder="https://calories.example.com"
              placeholderTextColor={role.textFaint}
              value={url}
            />
            {error ? <Text className="font-body text-sm text-danger">{error}</Text> : null}
            <View className="flex-row gap-sm">
              <AppButton
                disabled={serverUrlError(url) !== null}
                size="sm"
                onPress={() =>
                  onChoose({ mode: "self-hosted", serverUrl: url.trim().replace(/\/+$/, "") })
                }
              >
                Connect
              </AppButton>
              <AppButton size="sm" tone="quiet" onPress={() => setSelfHosting(false)}>
                Back
              </AppButton>
            </View>
          </Surface>
        ) : (
          <View className="gap-md">
            <Choice
              badge="No account"
              detail="Everything stays on this device and works offline. Export any time as JSON or CSV."
              onPress={() => onChoose(LOCAL_ONLY)}
              title="Just start logging"
            />
            {HOSTED_URL ? (
              <Choice
                detail="Sign in to sync between devices and publish a shareable profile."
                onPress={() => onChoose({ mode: "hosted", serverUrl: HOSTED_URL })}
                title="Use the cloud instance"
              />
            ) : null}
            <Choice
              detail="Point the app at a backend you run yourself."
              onPress={() => setSelfHosting(true)}
              title="I self-host"
            />
          </View>
        )}

        <Text className="font-body text-xs text-muted">
          You can change this later, and nothing is published until you say so.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
