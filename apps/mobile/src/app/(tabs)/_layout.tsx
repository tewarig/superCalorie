import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, Text } from "react-native";
import { colors } from "@/lib/theme";

/**
 * The four tabs, in the order they are reached for.
 *
 * Summary is home, and logging is reached from the button floating over it
 * rather than from a fourth tab — the two were showing the same day and
 * splitting them made you switch tabs to see the effect of what you had just
 * logged.
 */
const TABS = [
  { name: "index", title: "Summary", symbol: "circle.hexagongrid.fill", fallback: "◎" },
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
