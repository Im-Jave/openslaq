import { designTokens } from "./tokens";
import type { MobileTheme, ThemeMode } from "./types";

export function getMobileTheme(mode: ThemeMode): MobileTheme {
  return {
    mode,
    colors: mode === "dark" ? designTokens.dark : designTokens.light,
    brand: designTokens.brand,
    interaction: designTokens.interaction,
  };
}
