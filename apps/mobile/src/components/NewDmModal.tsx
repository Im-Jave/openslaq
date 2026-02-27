import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  listWorkspaceMembers,
  createDm,
  getErrorMessage,
} from "@openslaq/client-core";
import type { WorkspaceMember, OperationDeps } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
  workspaceSlug: string;
  currentUserId: string;
  deps: OperationDeps;
}

export function NewDmModal({
  visible,
  onClose,
  onCreated,
  workspaceSlug,
  currentUserId,
  deps,
}: Props) {
  const { theme } = useMobileTheme();
  const [filterText, setFilterText] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    listWorkspaceMembers({ api: deps.api, auth: deps.auth }, workspaceSlug)
      .then(setMembers)
      .catch((err) => setError(getErrorMessage(err, "Failed to load members")))
      .finally(() => setLoading(false));
  }, [visible, deps.api, deps.auth, workspaceSlug]);

  const filtered = members
    .filter((m) => m.id !== currentUserId)
    .filter(
      (m) =>
        !filterText ||
        m.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
        m.email.toLowerCase().includes(filterText.toLowerCase()),
    );

  const handleSelect = async (member: WorkspaceMember) => {
    setCreating(true);
    setError(null);
    try {
      const dm = await createDm(deps, {
        workspaceSlug,
        targetUserId: member.id,
      });
      if (dm) {
        setFilterText("");
        onCreated(dm.channel.id);
      } else {
        setError("Failed to create conversation");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create conversation"));
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFilterText("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        testID="new-dm-backdrop"
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
        onPress={handleClose}
      >
        <Pressable
          testID="new-dm-modal"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 16,
            paddingBottom: 34,
            maxHeight: "70%",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.textPrimary,
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            New Message
          </Text>
          <TextInput
            testID="new-dm-filter"
            placeholder="Search people..."
            placeholderTextColor={theme.colors.textFaint}
            value={filterText}
            onChangeText={setFilterText}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 16,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSecondary,
              marginHorizontal: 16,
              marginBottom: 8,
            }}
          />
          {loading && (
            <ActivityIndicator
              testID="new-dm-loading"
              style={{ marginVertical: 20 }}
              color={theme.brand.primary}
            />
          )}
          {error && (
            <Text
              testID="new-dm-error"
              style={{
                color: theme.colors.dangerText,
                paddingHorizontal: 16,
                marginBottom: 8,
              }}
            >
              {error}
            </Text>
          )}
          {creating && (
            <View
              testID="new-dm-creating"
              style={{ alignItems: "center", marginVertical: 20 }}
            >
              <ActivityIndicator size="small" color={theme.brand.primary} />
              <Text
                style={{
                  color: theme.colors.textFaint,
                  marginTop: 8,
                  fontSize: 14,
                }}
              >
                Opening conversation...
              </Text>
            </View>
          )}
          {!loading && !error && !creating && (
            <ScrollView
              testID="new-dm-member-list"
              keyboardShouldPersistTaps="handled"
            >
              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ color: theme.colors.textFaint, fontSize: 14 }}>
                    No members found
                  </Text>
                </View>
              ) : (
                filtered.map((item) => (
                  <Pressable
                    key={item.id}
                    testID={`new-dm-member-${item.id}`}
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    })}
                  >
                    <Text
                      style={{ fontSize: 16, color: theme.colors.textPrimary }}
                      numberOfLines={1}
                    >
                      {item.displayName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.colors.textFaint,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {item.email}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
