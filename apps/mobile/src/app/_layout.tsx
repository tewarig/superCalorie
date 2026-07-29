import "../global.css";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSans } from "@expo-google-fonts/dm-sans";
import { Fraunces_600SemiBold, useFonts as useFraunces } from "@expo-google-fonts/fraunces";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, View } from "react-native";
import { Onboarding } from "@/components/onboarding";
import { getConnection, saveConnection, subscribeToConnection } from "@/lib/local-store";
import { restoreSession } from "@/lib/session";

const storybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true";

function AppLoading() {
  return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color="#285B43" /></View>;
}

export default function RootLayout() {
  const [dmSansLoaded] = useDMSans({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold });

  if (!dmSansLoaded || !frauncesLoaded) return <AppLoading />;

  if (storybookEnabled) {
    // Storybook stays outside the product navigation and is omitted from release bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StorybookUIRoot = require("../../.rnstorybook").default;
    return <StorybookUIRoot />;
  }

  return <App />;
}

function App() {
  // Read synchronously rather than in an effect: the file is tiny and local,
  // and loading it asynchronously would flash the onboarding screen at
  // everyone who has already chosen. Subscribed so that changing the
  // connection from Sharing takes effect here too.
  const connection = useSyncExternalStore(subscribeToConnection, getConnection, getConnection);

  // Verifies a stored token against the server, if there is one to verify.
  // Runs after a connection exists, because which server to ask is part of
  // the answer.
  useEffect(() => {
    if (connection && connection.mode !== "local") void restoreSession();
  }, [connection]);

  return (
    <>
      <StatusBar style="dark" />
      {connection === null ? (
        <Onboarding onChoose={saveConnection} />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#EFF4E9" } }} />
      )}
    </>
  );
}
