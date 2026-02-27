import { memo } from "react";
import { Text, Pressable } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  token: string;
  displayName?: string;
  onPress?: (userId: string) => void;
}

function MentionBadgeInner({ token, displayName, onPress }: Props) {
  const { theme } = useMobileTheme();

  const isGroup = token === "here" || token === "channel";
  const label = isGroup ? `@${token}` : `@${displayName ?? token}`;

  const bgColor = isGroup ? "rgba(217, 119, 6, 0.15)" : "rgba(18, 100, 163, 0.1)";
  const textColor = isGroup ? "#b45309" : theme.brand.primary;

  if (onPress && !isGroup) {
    return (
      <Pressable
        testID={`mention-badge-${token}`}
        onPress={() => onPress(token)}
        style={{ backgroundColor: bgColor, borderRadius: 3, paddingHorizontal: 2 }}
      >
        <Text style={{ color: textColor, fontWeight: "600", fontSize: 14 }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Text
      testID={`mention-badge-${token}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontWeight: "600",
        fontSize: 14,
        borderRadius: 3,
        paddingHorizontal: 2,
      }}
    >
      {label}
    </Text>
  );
}

export const MentionBadge = memo(MentionBadgeInner);
