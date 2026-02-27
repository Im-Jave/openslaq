import type { ReactNode } from "react";
import { Text, TouchableOpacity, View, type TouchableOpacityProps } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "outline";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export function Button({ label, variant = "primary", icon, style, ...props }: ButtonProps) {
  const { theme } = useMobileTheme();

  const backgroundColor = variant === "primary"
    ? theme.brand.primary
    : variant === "secondary"
      ? theme.colors.surfaceSecondary
      : "transparent";

  const textColor = variant === "primary" ? "#ffffff" : theme.colors.textPrimary;

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor,
          borderRadius: 10,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: variant === "outline" ? theme.colors.borderStrong : "transparent",
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        },
        style,
      ]}
      activeOpacity={0.85}
      {...props}
    >
      {icon && <View>{icon}</View>}
      <Text
        style={{
          color: textColor,
          fontSize: 16,
          textAlign: "center",
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
