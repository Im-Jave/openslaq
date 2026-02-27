import { Image, Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  onPress: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

export function HeaderAvatarButton({ avatarUrl, displayName, onPress }: Props) {
  const { theme } = useMobileTheme();

  return (
    <Pressable testID="header-avatar-button" onPress={onPress} hitSlop={8}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: theme.colors.surfaceTertiary,
          }}
        />
      ) : (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: theme.brand.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            testID="header-avatar-initials"
            style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
          >
            {getInitials(displayName)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
