import "../src/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { MobileThemeProvider, useMobileTheme } from "@/theme/ThemeProvider";

function ThemedAppShell() {
  const { mode } = useMobileTheme();

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <MobileThemeProvider>
      <AuthContextProvider>
        <ThemedAppShell />
      </AuthContextProvider>
    </MobileThemeProvider>
  );
}
