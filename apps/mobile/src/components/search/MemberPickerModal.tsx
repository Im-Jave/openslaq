import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
} from "react-native";
import { listWorkspaceMembers, getErrorMessage } from "@openslaq/client-core";
import type { WorkspaceMember } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (userId: string, displayName: string) => void;
  workspaceSlug: string;
}

export function MemberPickerModal({ visible, onClose, onSelect, workspaceSlug }: Props) {
  const { theme } = useMobileTheme();
  const { authProvider } = useAuth();
  const [filterText, setFilterText] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    listWorkspaceMembers({ api, auth: authProvider }, workspaceSlug)
      .then(setMembers)
      .catch((err) => setError(getErrorMessage(err, "Failed to load members")))
      .finally(() => setLoading(false));
  }, [visible, authProvider, workspaceSlug]);

  const filtered = filterText
    ? members.filter((m) => m.displayName.toLowerCase().includes(filterText.toLowerCase()))
    : members;

  const handleSelect = (member: WorkspaceMember) => {
    setFilterText("");
    onSelect(member.id, member.displayName);
  };

  const handleClose = () => {
    setFilterText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        testID="member-picker-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable
          testID="member-picker-modal"
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
            Select Person
          </Text>
          <TextInput
            testID="member-picker-filter"
            placeholder="Filter people..."
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
              testID="member-picker-loading"
              style={{ marginVertical: 20 }}
              color={theme.brand.primary}
            />
          )}
          {error && (
            <Text
              testID="member-picker-error"
              style={{ color: theme.colors.dangerText, paddingHorizontal: 16, marginBottom: 8 }}
            >
              {error}
            </Text>
          )}
          {!loading && !error && (
            <FlatList
              testID="member-picker-list"
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  testID={`member-picker-item-${item.id}`}
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
                </Pressable>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
