import { AppButton } from "@supercalorie/ui/app-button";
import { Surface } from "@supercalorie/ui/surface";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getConnection } from "@/lib/local-store";
import { signIn, signUp } from "@/lib/session";
import { colors } from "@/lib/theme";

type Mode = "sign-in" | "sign-up";

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connection = getConnection();
  const local = !connection || connection.mode === "local";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "sign-in") await signIn(email.trim(), password);
      else await signUp(email.trim(), password, name.trim());
      router.back();
    } catch (cause) {
      // The server's own message, which says useful things like "an account
      // with this email already exists" — better than a generic failure.
      setError(cause instanceof Error ? cause.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    email.trim() !== "" && password !== "" && !busy && !local;

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
        <View className="flex-row justify-end">
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            className="rounded-full bg-moss-pale px-4 py-2"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Text className="font-bold text-sm text-moss">Close</Text>
          </Pressable>
        </View>

        <View>
          <Text className="font-display text-4xl text-ink">
            {mode === "sign-in" ? "Sign in" : "Create an account"}
          </Text>
          <Text className="mt-2 font-body text-sm text-muted">
            Optional. Your log already works without one — an account is for syncing to another
            device and publishing a profile.
          </Text>
        </View>

        {local ? (
          <Surface>
            <Text className="font-bold text-base text-ink">No server configured</Text>
            <Text className="mt-1 font-body text-sm text-muted">
              This device is set to keep everything local, so there is nowhere to sign in to.
              Choose a server from Sharing first.
            </Text>
          </Surface>
        ) : (
          <Surface className="gap-3">
            {mode === "sign-up" ? (
              <TextInput
                accessibilityLabel="Name"
                autoCapitalize="words"
                className="rounded-control border border-line bg-canvas px-4 py-3 font-body text-base text-ink"
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                value={name}
              />
            ) : null}

            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="rounded-control border border-line bg-canvas px-4 py-3 font-body text-base text-ink"
              inputMode="email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
            />

            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="rounded-control border border-line bg-canvas px-4 py-3 font-body text-base text-ink"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={password}
            />

            {error ? <Text className="font-body text-sm text-berry">{error}</Text> : null}

            <View className="flex-row items-center gap-3">
              <AppButton disabled={!canSubmit} onPress={submit}>
                {mode === "sign-in" ? "Sign in" : "Create account"}
              </AppButton>
              {busy ? <ActivityIndicator color={colors.moss} /> : null}
            </View>
          </Surface>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
          }}
        >
          <Text className="text-center font-bold text-sm text-moss">
            {mode === "sign-in" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </Text>
        </Pressable>

        <Text className="text-center font-body text-xs text-muted">
          {connection?.mode === "self-hosted"
            ? `Signing in to ${connection.serverUrl}`
            : "Signing in to the cloud instance"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
