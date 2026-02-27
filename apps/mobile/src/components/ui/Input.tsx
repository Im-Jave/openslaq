import { TextInput, type TextInputProps } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

export function Input({ style, placeholderTextColor, ...props }: TextInputProps) {
  const { theme } = useMobileTheme();

  return (
    <TextInput
      style={[
        {
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          borderRadius: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted}
      {...props}
    />
  );
}
