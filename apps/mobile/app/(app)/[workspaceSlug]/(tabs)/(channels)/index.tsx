import { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { ListRow } from "@/components/ui/ListRow";

export default function ChannelListScreen() {
  const router = useRouter();
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { state } = useChatStore();
  const { theme } = useMobileTheme();
  const [filter, setFilter] = useState("");

  if (state.ui.bootstrapLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (state.ui.bootstrapError) {
    return (
      <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-center" style={{ color: theme.colors.dangerText }}>{state.ui.bootstrapError}</Text>
      </View>
    );
  }

  const filtered = filter
    ? state.channels.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : state.channels;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.surface }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <TextInput
          testID="channel-list-filter"
          placeholder="Filter channels..."
          placeholderTextColor={theme.colors.textFaint}
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 14,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surfaceSecondary,
          }}
        />
      </View>
      <FlatList
        testID="channel-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const unread = state.unreadCounts[item.id] ?? 0;
          const icon = item.type === "private" ? "\u{1F512}" : "#";
          return (
            <ListRow
              testID={`channel-row-${index}`}
              onPress={() =>
                router.push(
                  `/(app)/${workspaceSlug}/(channels)/${item.id}`,
                )
              }
            >
              <Text className="mr-2 text-lg" style={{ color: theme.colors.textFaint }}>{icon}</Text>
              <Text
                className={`flex-1 text-base ${unread > 0 ? "font-bold" : ""}`}
                style={{ color: unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary }}
              >
                {item.name}
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
        ListFooterComponent={
          <ListRow
            testID="browse-channels-link"
            onPress={() => router.push(`/(app)/${workspaceSlug}/(channels)/browse`)}
          >
            <Text className="text-base" style={{ color: theme.brand.primary }}>
              Browse Channels
            </Text>
          </ListRow>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text style={{ color: theme.colors.textFaint }}>
              {filter ? "No channels match your filter" : "No channels yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
