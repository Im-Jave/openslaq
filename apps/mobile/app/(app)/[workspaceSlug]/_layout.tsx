import { Stack, useLocalSearchParams } from "expo-router";
import { WorkspaceBootstrapProvider } from "@/contexts/WorkspaceBootstrapProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function WorkspaceLayout() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { theme } = useMobileTheme();

  return (
    <WorkspaceBootstrapProvider workspaceSlug={workspaceSlug}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="thread/[parentMessageId]"
          options={{
            headerShown: true,
            title: "Thread",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="profile/[userId]"
          options={{
            headerShown: true,
            title: "Profile",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: "Settings",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.textPrimary,
          }}
        />
      </Stack>
    </WorkspaceBootstrapProvider>
  );
}
