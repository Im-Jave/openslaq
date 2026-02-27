import { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getMobileTheme, type MobileTheme, type ThemeMode } from "@openslaq/shared";
import type { ReactNode } from "react";

interface ThemeContextValue {
  theme: MobileTheme;
  mode: ThemeMode;
  setModeOverride: (mode: ThemeMode | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [modeOverride, setModeOverride] = useState<ThemeMode | null>(null);
  const systemMode: ThemeMode = systemColorScheme === "dark" ? "dark" : "light";
  const mode = modeOverride ?? systemMode;

  const value = useMemo(
    () => ({
      theme: getMobileTheme(mode),
      mode,
      setModeOverride,
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMobileTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value) return value;

  const fallback = getMobileTheme("light");
  return {
    theme: fallback,
    mode: "light",
    setModeOverride: () => {},
  };
}
