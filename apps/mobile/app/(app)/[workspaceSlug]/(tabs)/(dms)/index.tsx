import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { ListRow } from "@/components/ui/ListRow";

export default function DmListScreen() {
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { theme } = useMobileTheme();

  if (state.ui.bootstrapLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.surface }}>
      <FlatList
        data={state.dms}
        keyExtractor={(item) => item.channel.id}
        renderItem={({ item }) => {
          const unread = state.unreadCounts[item.channel.id] ?? 0;
          const presence = state.presence[item.otherUser.id];
          const isOnline = presence?.online === true;

          return (
            <ListRow
              onPress={() =>
                router.push(
                  `/(app)/${workspaceSlug}/(dms)/${item.channel.id}`,
                )
              }
            >
              <View className="relative mr-3">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.colors.avatarFallbackBg }}
                >
                  <Text className="font-medium" style={{ color: theme.colors.avatarFallbackText }}>
                    {item.otherUser.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                {isOnline && (
                  <View
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: theme.brand.success, borderColor: theme.colors.surface }}
                  />
                )}
              </View>
              <Text
                className={`flex-1 text-base ${unread > 0 ? "font-bold" : ""}`}
                style={{ color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary }}
              >
                {item.otherUser.displayName ?? "Unknown"}
              </Text>
              {unread > 0 && (
                <View
                  className="rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center"
                  style={{ backgroundColor: theme.interaction.badgeUnreadBg }}
                >
                  <Text className="text-xs font-bold" style={{ color: theme.interaction.badgeUnreadText }}>
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              )}
            </ListRow>
          );
        }}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text style={{ color: theme.colors.textFaint }}>No conversations yet</Text>
          </View>
        }
      />
    </View>
  );
}
