import { AppButton } from "@supercalorie/ui/app-button";
import { Surface } from "@supercalorie/ui/surface";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getConnection } from "@/lib/local-store";
import { signIn, signUp } from "@/lib/session";
import { role } from "@/lib/theme";

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
      <ScrollView contentContainerClassName="gap-lg px-gutter pb-xxxl pt-lg" keyboardShouldPersistTaps="handled">
        <View className="flex-row justify-end">
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            className="rounded-full bg-primary-soft px-lg py-sm"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Text className="font-bold text-sm text-primary">Close</Text>
          </Pressable>
        </View>

        <View>
          <Text className="font-display text-4xl text-ink">
            {mode === "sign-in" ? "Sign in" : "Create an account"}
          </Text>
          <Text className="mt-sm font-body text-sm text-muted">
            Optional. Your log already works without one — an account is for syncing to another
            device and publishing a profile.
          </Text>
        </View>

        {local ? (
          <Surface>
            <Text className="font-bold text-base text-ink">No server configured</Text>
            <Text className="mt-xs font-body text-sm text-muted">
              This device is set to keep everything local, so there is nowhere to sign in to.
              Choose a server from Sharing first.
            </Text>
          </Surface>
        ) : (
          <Surface className="gap-md">
            {mode === "sign-up" ? (
              <TextInput
                accessibilityLabel="Name"
                autoCapitalize="words"
                className="rounded-control border border-line bg-canvas px-lg py-md font-body text-base text-ink"
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={role.textFaint}
                value={name}
              />
            ) : null}

            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="rounded-control border border-line bg-canvas px-lg py-md font-body text-base text-ink"
              inputMode="email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={role.textFaint}
              value={email}
            />

            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="rounded-control border border-line bg-canvas px-lg py-md font-body text-base text-ink"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={role.textFaint}
              secureTextEntry
              value={password}
            />

            {error ? <Text className="font-body text-sm text-danger">{error}</Text> : null}

            <View className="flex-row items-center gap-md">
              <AppButton disabled={!canSubmit} onPress={submit}>
                {mode === "sign-in" ? "Sign in" : "Create account"}
              </AppButton>
              {busy ? <ActivityIndicator color={role.primary} /> : null}
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
          <Text className="text-center font-bold text-sm text-primary">
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
