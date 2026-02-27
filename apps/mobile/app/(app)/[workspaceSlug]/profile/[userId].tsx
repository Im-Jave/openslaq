import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { listWorkspaceMembers, createDm, type WorkspaceMember } from "@openslaq/client-core";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

function roleBadgeColor(role: string): string {
  switch (role) {
    case "owner":
      return "#d97706";
    case "admin":
      return "#2563eb";
    default:
      return "#6b7280";
  }
}

export default function ProfileScreen() {
  const { workspaceSlug, userId } = useLocalSearchParams<{
    workspaceSlug: string;
    userId: string;
  }>();
  const { authProvider, user: currentUser } = useAuth();
  const { state, dispatch } = useChatStore();
  const router = useRouter();
  const { theme } = useMobileTheme();

  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;
  const presence = userId ? state.presence[userId] : undefined;

  useEffect(() => {
    if (!workspaceSlug || !userId) return;
    let cancelled = false;
    const deps = { api, auth: authProvider };
    void listWorkspaceMembers(deps, workspaceSlug).then((members) => {
      if (cancelled) return;
      const found = members.find((m) => m.id === userId);
      setMember(found ?? null);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [workspaceSlug, userId, authProvider]);

  const handleSendMessage = useCallback(async () => {
    if (!workspaceSlug || !userId) return;
    try {
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      const result = await createDm(deps, { workspaceSlug, targetUserId: userId });
      if (!result) throw new Error("DM not created");
      router.push(`/(app)/${workspaceSlug}/(dms)/${result.channel.id}`);
    } catch {
      Alert.alert("Error", "Failed to create direct message");
    }
  }, [workspaceSlug, userId, authProvider, dispatch, state, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
        <Text style={{ color: theme.colors.textFaint }}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      testID="profile-screen"
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      contentContainerStyle={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }}
    >
      {member.avatarUrl ? (
        <Image
          source={{ uri: member.avatarUrl }}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: theme.colors.surfaceTertiary,
            marginBottom: 16,
          }}
        />
      ) : (
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: theme.brand.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 36, fontWeight: "700" }}>
            {getInitials(member.displayName)}
          </Text>
        </View>
      )}

      <Text
        testID="profile-display-name"
        style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 4 }}
      >
        {member.displayName}
      </Text>

      <Text
        testID="profile-email"
        style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 12 }}
      >
        {member.email}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: roleBadgeColor(member.role) + "22",
            marginRight: 8,
          }}
        >
          <Text style={{ color: roleBadgeColor(member.role), fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>
            {member.role}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: presence?.online ? "#22c55e" : "#9ca3af",
              marginRight: 4,
            }}
          />
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {presence?.online ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      {!isOwnProfile && (
        <Pressable
          testID="profile-send-message"
          onPress={handleSendMessage}
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.brand.primary + "dd" : theme.brand.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 8,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Send Message</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
