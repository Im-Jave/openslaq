import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { Message, ChannelId, MessageId, ReactionGroup } from "@openslaq/shared";
import {
  loadChannelMessages,
  sendMessage as coreSendMessage,
  listWorkspaceMembers,
} from "@openslaq/client-core";
import type { MentionSuggestionItem } from "@/hooks/useMentionAutocomplete";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useTypingEmitter } from "@/hooks/useTypingEmitter";
import { useTypingTracking } from "@/hooks/useTypingTracking";
import { useFileUpload } from "@/hooks/useFileUpload";
import { api } from "@/lib/api";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageActionSheet } from "@/components/MessageActionSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { useMobileTheme } from "@/theme/ThemeProvider";

export default function DmScreen() {
  const { workspaceSlug: urlSlug, dmChannelId } = useLocalSearchParams<{
    workspaceSlug: string;
    dmChannelId: string;
  }>();
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const workspaceSlug = state.workspaceSlug ?? urlSlug;
  const { joinChannel, leaveChannel } = useSocket();
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const { handleEditMessage, handleDeleteMessage, handleToggleReaction } = useMessageActions({
    authProvider,
    state,
    dispatch,
    userId: user?.id,
  });

  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [members, setMembers] = useState<MentionSuggestionItem[]>([]);

  const { emitTyping } = useTypingEmitter(dmChannelId);
  const typingUsers = useTypingTracking(dmChannelId, user?.id, members);
  const fileUpload = useFileUpload();

  const dm = state.dms.find((d) => d.channel.id === dmChannelId);

  // Set header title
  useEffect(() => {
    if (dm) {
      navigation.setOptions({ title: dm.otherUser.displayName ?? "DM" });
    }
  }, [dm, navigation]);

  // Select the DM in state
  useEffect(() => {
    if (dmChannelId) {
      dispatch({ type: "workspace/selectDm", channelId: dmChannelId });
    }
  }, [dmChannelId, dispatch]);

  // Load messages
  useEffect(() => {
    if (!workspaceSlug || !dmChannelId) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void loadChannelMessages(deps, {
      workspaceSlug,
      channelId: dmChannelId,
    }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmChannelId, dispatch, authProvider, workspaceSlug]);

  // Load workspace members for mention autocomplete
  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void listWorkspaceMembers(deps, workspaceSlug).then((result) => {
      if (cancelled) return;
      setMembers(result.map((m) => ({ id: m.id, displayName: m.displayName })));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, authProvider]);

  // Join/leave socket room
  useEffect(() => {
    if (!dmChannelId) return;
    joinChannel(dmChannelId as Parameters<typeof joinChannel>[0]);
    return () => {
      leaveChannel(dmChannelId as Parameters<typeof leaveChannel>[0]);
    };
  }, [dmChannelId, joinChannel, leaveChannel]);

  // Real-time events
  const onMessageNew = useCallback(
    (message: Message) => {
      dispatch({ type: "messages/upsert", message });
    },
    [dispatch],
  );

  const onMessageUpdated = useCallback(
    (message: Message) => {
      dispatch({ type: "messages/upsert", message });
    },
    [dispatch],
  );

  const onMessageDeleted = useCallback(
    (payload: { id: string; channelId: string }) => {
      dispatch({
        type: "messages/delete",
        messageId: payload.id,
        channelId: payload.channelId,
      });
    },
    [dispatch],
  );

  const onReactionUpdated = useCallback(
    (payload: { messageId: MessageId; channelId: ChannelId; reactions: ReactionGroup[] }) => {
      if (payload.channelId === dmChannelId) {
        dispatch({
          type: "messages/updateReactions",
          messageId: payload.messageId,
          reactions: payload.reactions,
        });
      }
    },
    [dmChannelId, dispatch],
  );

  useSocketEvent("message:new", onMessageNew);
  useSocketEvent("message:updated", onMessageUpdated);
  useSocketEvent("message:deleted", onMessageDeleted);
  useSocketEvent("reaction:updated", onReactionUpdated);

  // Get messages
  const messageIds = dmChannelId
    ? state.channelMessageIds[dmChannelId] ?? []
    : [];
  const messages = messageIds
    .map((id) => state.messagesById[id])
    .filter((m): m is Message => Boolean(m));

  const isLoading = dmChannelId
    ? state.ui.channelMessagesLoading[dmChannelId]
    : false;

  const handlePressThread = useCallback(
    (messageId: string) => {
      router.push(`/${workspaceSlug}/thread/${messageId}`);
    },
    [router, workspaceSlug],
  );

  const handlePressSender = useCallback(
    (userId: string) => {
      router.push(`/(app)/${workspaceSlug}/profile/${userId}`);
    },
    [router, workspaceSlug],
  );

  const handleAddAttachment = useCallback(() => {
    Alert.alert("Attach", undefined, [
      { text: "Photo Library", onPress: () => void fileUpload.addFromImagePicker() },
      { text: "Camera", onPress: () => void fileUpload.addFromCamera() },
      { text: "File", onPress: () => void fileUpload.addFromDocumentPicker() },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [fileUpload]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!workspaceSlug || !dmChannelId) return;
      let attachmentIds: string[] = [];
      if (fileUpload.hasFiles) {
        attachmentIds = await fileUpload.uploadAll(() => authProvider.requireAccessToken());
      }
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      await coreSendMessage(deps, {
        channelId: dmChannelId,
        workspaceSlug,
        content,
        attachmentIds,
      });
      fileUpload.reset();
    },
    [authProvider, dmChannelId, dispatch, fileUpload, state, workspaceSlug],
  );

  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessage({ id: message.id, content: message.content });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      await handleEditMessage(messageId, content);
      setEditingMessage(null);
    },
    [handleEditMessage],
  );

  const handleLongPress = useCallback((message: Message) => {
    setActionSheetMessage(message);
  }, []);

  const handleOpenEmojiPicker = useCallback(() => {
    if (actionSheetMessage) {
      setEmojiPickerMessageId(actionSheetMessage.id);
    }
    setShowEmojiPicker(true);
  }, [actionSheetMessage]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (emojiPickerMessageId) {
        handleToggleReaction(emojiPickerMessageId, emoji);
      }
      setShowEmojiPicker(false);
      setEmojiPickerMessageId(null);
    },
    [emojiPickerMessageId, handleToggleReaction],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      keyboardVerticalOffset={90}
    >
      {isLoading && messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          testID="message-list"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onPressThread={handlePressThread}
              currentUserId={user?.id}
              onToggleReaction={handleToggleReaction}
              onLongPress={handleLongPress}
              onPressSender={handlePressSender}
            />
          )}
          inverted={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text style={{ color: theme.colors.textFaint }}>No messages yet</Text>
            </View>
          }
          contentContainerStyle={
            messages.length === 0 ? { flex: 1 } : undefined
          }
        />
      )}
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        onSend={handleSend}
        placeholder={
          dm ? `Message ${dm.otherUser.displayName ?? ""}` : "Message"
        }
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        members={members}
        onTyping={emitTyping}
        pendingFiles={fileUpload.pendingFiles}
        onAddAttachment={handleAddAttachment}
        onRemoveFile={fileUpload.removeFile}
        uploading={fileUpload.uploading}
      />
      <MessageActionSheet
        visible={actionSheetMessage != null}
        message={actionSheetMessage}
        currentUserId={user?.id}
        onReaction={handleToggleReaction}
        onOpenEmojiPicker={handleOpenEmojiPicker}
        onEditMessage={handleStartEdit}
        onDeleteMessage={handleDeleteMessage}
        onClose={() => setActionSheetMessage(null)}
      />
      <EmojiPickerSheet
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => {
          setShowEmojiPicker(false);
          setEmojiPickerMessageId(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
