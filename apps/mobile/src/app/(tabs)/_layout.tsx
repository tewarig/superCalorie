import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, Text } from "react-native";
import { colors } from "@/lib/theme";

/**
 * The four tabs, in the order they are reached for.
 *
 * Summary is home. Log gets its own tab rather than living behind a button on
 * Summary because it is the thing people open the app to do, and burying the
 * primary action one scroll down is what made the old single screen read like
 * a to-do list.
 */
const TABS = [
  { name: "index", title: "Summary", symbol: "circle.hexagongrid.fill", fallback: "◎" },
  { name: "log", title: "Log", symbol: "plus.circle.fill", fallback: "＋" },
  { name: "trends", title: "Trends", symbol: "chart.bar.fill", fallback: "▥" },
  { name: "sharing", title: "Sharing", symbol: "person.2.fill", fallback: "👥" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontFamily: "DMSans_700Bold", fontSize: 11 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) =>
              // SF Symbols are iOS-only; Android gets the glyph rather than a
              // blank space where the icon should be.
              Platform.OS === "ios" ? (
                <SymbolView name={tab.symbol} size={size} tintColor={color} />
              ) : (
                <Text style={{ color, fontSize: size - 4 }}>{tab.fallback}</Text>
              ),
          }}
        />
      ))}
    </Tabs>
  );
}
