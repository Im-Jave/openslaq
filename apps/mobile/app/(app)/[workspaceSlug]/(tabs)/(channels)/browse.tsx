import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ChannelId } from "@openslaq/shared";
import {
  browseChannels,
  joinChannel as coreJoinChannel,
  type BrowseChannel,
} from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";

export default function BrowseChannelsScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const { socket } = useSocket();
  const router = useRouter();
  const { theme } = useMobileTheme();

  const [channels, setChannels] = useState<BrowseChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    const deps = { api, auth: authProvider };
    const result = await browseChannels(deps, workspaceSlug);
    setChannels(result);
  }, [authProvider, workspaceSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChannels()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetchChannels]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChannels().catch(() => {});
    setRefreshing(false);
  }, [fetchChannels]);

  const handleJoin = useCallback(
    async (channelId: ChannelId) => {
      setJoiningId(channelId);
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      try {
        await coreJoinChannel(deps, {
          workspaceSlug,
          channelId,
          socket,
        });
        // Update local browse list
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId ? { ...ch, isMember: true } : ch,
          ),
        );
        router.push(`/(app)/${workspaceSlug}/(channels)/${channelId}`);
      } catch {
        // Ignore — user will see the channel unchanged
      } finally {
        setJoiningId(null);
      }
    },
    [authProvider, dispatch, router, socket, state, workspaceSlug],
  );

  const filtered = filter
    ? channels.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : channels;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <TextInput
          testID="browse-channel-filter"
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
        testID="browse-channel-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item, index }) => (
          <View
            testID={`browse-channel-row-${index}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.borderSecondary,
            }}
          >
            <Text style={{ color: theme.colors.textFaint, fontSize: 16, marginRight: 8 }}>#</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
                {item.memberCount ?? 0} {(item.memberCount ?? 0) === 1 ? "member" : "members"}
              </Text>
            </View>
            {item.isMember ? (
              <Text style={{ color: theme.colors.textFaint, fontSize: 14, fontWeight: "500" }}>Joined</Text>
            ) : (
              <Pressable
                testID={`browse-join-${item.id}`}
                onPress={() => handleJoin(item.id)}
                disabled={joiningId === item.id}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.brand.primary + "cc" : theme.brand.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 6,
                  opacity: joiningId === item.id ? 0.6 : 1,
                })}
              >
                {joiningId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Join</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ color: theme.colors.textFaint }}>
              {filter ? "No channels match your filter" : "No public channels"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
