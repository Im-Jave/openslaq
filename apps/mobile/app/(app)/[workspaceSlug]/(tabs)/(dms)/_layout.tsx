import { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { NewDmModal } from "@/components/NewDmModal";
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

function NewDmButton({ onPress }: { onPress: () => void }) {
  const { theme } = useMobileTheme();

  return (
    <Pressable testID="new-dm-button" onPress={onPress} hitSlop={8}>
      <Text style={{ color: theme.brand.primary, fontSize: 24, fontWeight: "300" }}>+</Text>
    </Pressable>
  );
}

export default function DmsLayout() {
  const { workspaceSlug: urlSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const router = useRouter();
  const [showNewDm, setShowNewDm] = useState(false);
  const { profile } = useCurrentUserProfile();

  // Prefer the store's workspace slug (set during bootstrap) over URL param,
  // since expo-router tab switches can sometimes lose params in nested layouts.
  const workspaceSlug = state.workspaceSlug ?? urlSlug;
  const deps = { api, auth: authProvider, dispatch, getState: () => state };

  const handleCreated = (channelId: string) => {
    setShowNewDm(false);
    router.push(`/(app)/${workspaceSlug}/(dms)/${channelId}`);
  };

  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Direct Messages",
            headerRight: () => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <SearchButton workspaceSlug={workspaceSlug} />
                <NewDmButton onPress={() => setShowNewDm(true)} />
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
          name="[dmChannelId]"
          options={{ title: "", headerBackTitle: "Back" }}
        />
      </Stack>
      <NewDmModal
        visible={showNewDm}
        onClose={() => setShowNewDm(false)}
        workspaceSlug={workspaceSlug}
        currentUserId={user?.id ?? ""}
        deps={deps}
        onCreated={handleCreated}
      />
    </>
  );
}
