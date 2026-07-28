import { color } from "@supercalorie/ui/tokens";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * No session provider and no auth gate: the app opens straight into the
 * tracker. Signing in is an optional extra for backing up to a server, not
 * a prerequisite for using anything.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.background },
        }}
      />
    </>
  );
}
