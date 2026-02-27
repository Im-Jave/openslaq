import { useCallback, useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, Text, ActivityIndicator } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useMentionAutocomplete, type MentionSuggestionItem } from "@/hooks/useMentionAutocomplete";
import { MentionSuggestionList } from "./MentionSuggestionList";
import { FilePreviewStrip } from "./FilePreviewStrip";
import type { PendingFile } from "@/hooks/useFileUpload";

interface Props {
  onSend: (content: string) => void;
  placeholder?: string;
  editingMessage?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, content: string) => void;
  members?: MentionSuggestionItem[];
  onTyping?: () => void;
  pendingFiles?: PendingFile[];
  onAddAttachment?: () => void;
  onRemoveFile?: (id: string) => void;
  uploading?: boolean;
}

export function MessageInput({
  onSend,
  placeholder = "Message",
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  members = [],
  onTyping,
  pendingFiles = [],
  onAddAttachment,
  onRemoveFile,
  uploading = false,
}: Props) {
  const [text, setText] = useState("");
  const { theme } = useMobileTheme();
  const inputRef = useRef<TextInput>(null);

  const { suggestions, isActive, onSelectionChange, insertMention } =
    useMentionAutocomplete({ text, members });

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const canSend = text.trim().length > 0 || pendingFiles.length > 0;

  const handleSend = () => {
    if (uploading) return;

    if (editingMessage && onSaveEdit) {
      const trimmed = text.trim();
      if (trimmed && trimmed !== editingMessage.content) {
        onSaveEdit(editingMessage.id, trimmed);
      }
      onCancelEdit?.();
      setText("");
      return;
    }

    if (!canSend) return;

    onSend(text.trim());
    setText("");
  };

  const handleCancel = () => {
    onCancelEdit?.();
    setText("");
  };

  const handleSelectMention = useCallback(
    (item: MentionSuggestionItem) => {
      const result = insertMention(item);
      setText(result.text);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: result.cursorPosition, end: result.cursorPosition },
        });
      }, 0);
    },
    [insertMention],
  );

  return (
    <View style={{ position: "relative" }}>
      {isActive && suggestions.length > 0 && (
        <MentionSuggestionList
          suggestions={suggestions}
          onSelect={handleSelectMention}
        />
      )}
      {editingMessage && (
        <View
          testID="edit-banner"
          className="flex-row items-center justify-between px-4 py-2 border-t"
          style={{ borderColor: theme.colors.borderDefault, backgroundColor: theme.colors.surfaceTertiary }}
        >
          <Text className="text-xs font-medium" style={{ color: theme.brand.primary }}>
            Editing message
          </Text>
          <Pressable testID="edit-cancel" onPress={handleCancel} hitSlop={8}>
            <Text className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      )}
      {pendingFiles.length > 0 && onRemoveFile && (
        <View className="border-t" style={{ borderColor: theme.colors.borderDefault }}>
          <FilePreviewStrip files={pendingFiles} onRemove={onRemoveFile} />
        </View>
      )}
      <View
        className="flex-row items-end px-3 py-2 border-t"
        style={{ borderColor: theme.colors.borderDefault, backgroundColor: theme.colors.surface }}
      >
        {onAddAttachment && (
          <Pressable
            testID="attachment-button"
            className="w-9 h-9 rounded-full items-center justify-center mr-1"
            style={{ backgroundColor: theme.colors.surfaceTertiary }}
            onPress={onAddAttachment}
          >
            <Text className="text-lg" style={{ color: theme.colors.textMuted }}>+</Text>
          </Pressable>
        )}
        <TextInput
          ref={inputRef}
          testID="message-input"
          className="flex-1 rounded-2xl px-4 py-2 text-base max-h-24"
          style={{
            backgroundColor: theme.colors.surfaceTertiary,
            color: theme.colors.textPrimary,
          }}
          placeholderTextColor={theme.colors.textMuted}
          placeholder={placeholder}
          value={text}
          onChangeText={(value) => {
            setText(value);
            onTyping?.();
          }}
          multiline
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          onSelectionChange={onSelectionChange}
        />
        <Pressable
          testID="message-send"
          className="ml-2 w-9 h-9 rounded-full items-center justify-center"
          style={({ pressed }) => ({
            backgroundColor: canSend && !uploading ? theme.brand.primary : theme.colors.borderStrong,
            opacity: pressed ? 0.85 : 1,
          })}
          onPress={handleSend}
          disabled={!canSend || uploading}
        >
          {uploading ? (
            <ActivityIndicator testID="upload-spinner" size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">↑</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
