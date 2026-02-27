import { Alert, Modal, Pressable, Text, View } from "react-native";
import type { Message } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

const QUICK_REACTIONS = ["✅", "👀", "🙌"];

interface Props {
  visible: boolean;
  message: Message | null;
  currentUserId?: string;
  onReaction: (messageId: string, emoji: string) => void;
  onOpenEmojiPicker: () => void;
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onClose: () => void;
}

export function MessageActionSheet({
  visible,
  message,
  currentUserId,
  onReaction,
  onOpenEmojiPicker,
  onEditMessage,
  onDeleteMessage,
  onClose,
}: Props) {
  const { theme } = useMobileTheme();

  if (!message) return null;

  const isOwnMessage = currentUserId != null && message.userId === currentUserId;

  const handleReaction = (emoji: string) => {
    onReaction(message.id, emoji);
    onClose();
  };

  const handleOpenPicker = () => {
    onClose();
    onOpenEmojiPicker();
  };

  const handleEdit = () => {
    onClose();
    onEditMessage(message);
  };

  const handleDelete = () => {
    onClose();
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteMessage(message.id),
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID="action-sheet-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          testID="action-sheet-content"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 34,
            paddingTop: 12,
            paddingHorizontal: 16,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Quick reactions row */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                testID={`quick-reaction-${emoji}`}
                onPress={() => handleReaction(emoji)}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </Pressable>
            ))}
            <Pressable
              testID="quick-reaction-picker"
              onPress={handleOpenPicker}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceSecondary,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Text style={{ fontSize: 20, color: theme.colors.textMuted }}>+</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginBottom: 8 }} />

          {/* Actions */}
          {isOwnMessage && (
            <>
              <Pressable
                testID="action-edit-message"
                onPress={handleEdit}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
                })}
              >
                <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>Edit Message</Text>
              </Pressable>
              <Pressable
                testID="action-delete-message"
                onPress={handleDelete}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : "transparent",
                })}
              >
                <Text style={{ fontSize: 16, color: theme.brand.danger }}>Delete Message</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
