import { Button } from "@supercalorie/ui/button";
import { Input } from "@supercalorie/ui/input";
import { color, fontSize, radius, space } from "@supercalorie/ui/tokens";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function LoginScreen() {
  const { login, signup } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (isSignup) {
        await signup(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      // Navigation is handled by the index screen once `user` is set.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>
            super<Text style={{ color: color.accent }}>Calorie</Text>
          </Text>
          <Text style={styles.title}>{isSignup ? "Start tracking" : "Welcome back"}</Text>
          <Text style={styles.subtitle}>
            {isSignup ? "One account for every device." : "Pick up where you left off."}
          </Text>

          <View style={styles.form}>
            {isSignup && (
              <Input label="Name" value={name} onChangeText={setName} placeholder="Gaurav" />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChangeText={setPassword}
              placeholder={isSignup ? "At least 8 characters" : "••••••••"}
              onSubmit={submit}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button fullWidth size="lg" onPress={submit} disabled={pending}>
              {pending ? "One moment…" : isSignup ? "Create account" : "Log in"}
            </Button>

            <Pressable
              onPress={() => {
                setMode(isSignup ? "login" : "signup");
                setError(null);
              }}
            >
              <Text style={styles.switchMode}>
                {isSignup ? "Already have an account? Log in" : "New here? Create one"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.apiHint}>Backend: {API_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.xl, paddingTop: space.xxxl, flexGrow: 1 },
  brand: { fontSize: fontSize.lg, fontWeight: "700", color: color.text },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: color.text,
    marginTop: space.xxl,
  },
  subtitle: { fontSize: fontSize.md, color: color.textMuted, marginTop: space.sm },
  form: { marginTop: space.xxl, gap: space.lg },
  error: {
    backgroundColor: "#FDECEA",
    color: "#8C2C1E",
    padding: space.md,
    borderRadius: radius.md,
    fontSize: fontSize.sm,
  },
  switchMode: {
    textAlign: "center",
    color: color.primary,
    fontWeight: "600",
    fontSize: fontSize.sm,
    marginTop: space.sm,
  },
  apiHint: {
    marginTop: "auto",
    paddingTop: space.xl,
    textAlign: "center",
    fontSize: fontSize.xs,
    color: color.textFaint,
  },
});
