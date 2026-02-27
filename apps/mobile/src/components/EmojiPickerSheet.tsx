import { useMemo } from "react";
import EmojiPicker from "rn-emoji-keyboard";
import type { EmojiType } from "rn-emoji-keyboard";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPickerSheet({ visible, onSelect, onClose }: Props) {
  const { theme, mode } = useMobileTheme();

  const pickerTheme = useMemo(
    () =>
      mode === "dark"
        ? {
            backdrop: "#00000055",
            container: theme.colors.surfaceSecondary,
            header: theme.colors.textPrimary,
            knob: theme.colors.textMuted,
            category: {
              icon: theme.colors.textMuted,
              iconActive: theme.brand.primary,
              container: theme.colors.surfaceSecondary,
              containerActive: theme.colors.surfaceTertiary,
            },
            search: {
              background: theme.colors.surfaceTertiary,
              text: theme.colors.textPrimary,
              placeholder: theme.colors.textFaint,
              icon: theme.colors.textMuted,
            },
          }
        : { backdrop: "#00000055" },
    [mode, theme],
  );

  const handlePick = (emoji: EmojiType) => {
    onSelect(emoji.emoji);
    onClose();
  };

  return (
    <EmojiPicker
      open={visible}
      onEmojiSelected={handlePick}
      onClose={onClose}
      theme={pickerTheme}
      enableSearchBar
      categoryPosition="top"
    />
  );
}
