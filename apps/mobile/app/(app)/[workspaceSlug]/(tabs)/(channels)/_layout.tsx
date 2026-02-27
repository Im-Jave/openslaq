import { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { Channel } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { CreateChannelModal } from "@/components/CreateChannelModal";
import { HeaderAvatarButton } from "@/components/HeaderAvatarButton";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { api } from "@/lib/api";

function SearchButton({ workspaceSlug }: { workspaceSlug: string }) {
  const { theme } = useMobileTheme();
  const router = useRouter();

  return (
    <Pressable
      testID="search-button"
      onPress={() => router.push(`/(app)/${workspaceSlug}/search`)}
      hitSlop={8}
      style={{ marginRight: 12 }}
    >
      <Text style={{ color: theme.brand.primary, fontSize: 20 }}>{"\u{1F50D}"}</Text>
    </Pressable>
  );
}

function CreateChannelButton({ onPress }: { onPress: () => void }) {
  const { theme } = useMobileTheme();

  return (
    <Pressable testID="create-channel-button" onPress={onPress} hitSlop={8}>
      <Text style={{ color: theme.brand.primary, fontSize: 24, fontWeight: "300" }}>+</Text>
    </Pressable>
  );
}

export default function ChannelsLayout() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider } = useAuth();
  const { state, dispatch } = useChatStore();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const { profile } = useCurrentUserProfile();

  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const isAdmin = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";
  const deps = { api, auth: authProvider, dispatch, getState: () => state };

  const handleCreated = (channel: Channel) => {
    setShowCreate(false);
    router.push(`/(app)/${workspaceSlug}/(channels)/${channel.id}`);
  };

  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Channels",
            headerRight: () => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <SearchButton workspaceSlug={workspaceSlug} />
                <CreateChannelButton onPress={() => setShowCreate(true)} />
                <View style={{ marginLeft: 12 }}>
                  <HeaderAvatarButton
                    avatarUrl={profile?.avatarUrl}
                    displayName={profile?.displayName}
                    onPress={() => router.push(`/(app)/${workspaceSlug}/settings`)}
                  />
                </View>
              </View>
            ),
          }}
        />
        <Stack.Screen
          name="browse"
          options={{ title: "Browse Channels", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="[channelId]"
          options={{ title: "", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="channel-members"
          options={{ title: "Members", headerBackTitle: "Back" }}
        />
      </Stack>
      <CreateChannelModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        workspaceSlug={workspaceSlug}
        canCreatePrivate={isAdmin}
        deps={deps}
        onCreated={handleCreated}
      />
    </>
  );
}
