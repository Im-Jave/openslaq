import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function TabsLayout() {
  const { theme } = useMobileTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderDefault,
        },
      }}
    >
      <Tabs.Screen
        name="(channels)"
        options={{
          title: "Channels",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>#</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(dms)"
        options={{
          title: "DMs",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>@</Text>
          ),
        }}
      />
    </Tabs>
  );
}
