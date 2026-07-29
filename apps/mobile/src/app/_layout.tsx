import "../global.css";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSans } from "@expo-google-fonts/dm-sans";
import { Fraunces_600SemiBold, useFonts as useFraunces } from "@expo-google-fonts/fraunces";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

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

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#EFF4E9" } }} />
    </>
  );
}
