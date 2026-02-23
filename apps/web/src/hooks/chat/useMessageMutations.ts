import { useCallback } from "react";
import type { Attachment, Message, ReactionGroup } from "@openslack/shared";
import { asChannelId, asMessageId, asUserId } from "@openslack/shared";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

interface AuthJsonUser {
  id: string;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

interface SendMessageInput {
  channelId: string;
  workspaceSlug: string;
  content: string;
  attachmentIds?: string[];
  attachments?: Attachment[];
  parentMessageId?: string | null;
}

export function useMessageMutations(user: AuthJsonUser | null | undefined) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;

      const existing = state.messagesById[messageId];
      const previousReactions: ReactionGroup[] = existing?.reactions ?? [];

      if (existing) {
        const currentUserId = asUserId(user.id);
        const current = previousReactions.find((group) => group.emoji === emoji);
        let nextReactions: ReactionGroup[];

        if (!current) {
          nextReactions = [...previousReactions, { emoji, count: 1, userIds: [currentUserId] }];
        } else {
          const hasReacted = current.userIds.includes(currentUserId);
          if (hasReacted) {
            const nextUserIds = current.userIds.filter((id) => id !== currentUserId);
            nextReactions =
              nextUserIds.length === 0
                ? previousReactions.filter((group) => group.emoji !== emoji)
                : previousReactions.map((group) =>
                    group.emoji === emoji
                      ? { ...group, userIds: nextUserIds, count: Math.max(0, group.count - 1) }
                      : group,
                  );
          } else {
            nextReactions = previousReactions.map((group) =>
              group.emoji === emoji
                ? { ...group, userIds: [...group.userIds, currentUserId], count: group.count + 1 }
                : group,
            );
          }
        }

        dispatch({ type: "messages/updateReactions", messageId, reactions: nextReactions });
      }

      if (isGallery) {
        return;
      }

      try {
        dispatch({ type: "mutations/error", error: null });
        await authorizedRequest(user, (headers) =>
          api.api.messages[":id"].reactions.$post(
            { param: { id: messageId }, json: { emoji } },
            { headers },
          ),
        );
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }

        if (existing) {
          dispatch({ type: "messages/updateReactions", messageId, reactions: previousReactions });
        }
        dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to update reaction") });
      }
    },
    [dispatch, isGallery, state.messagesById, user],
  );

  const sendMessage = useCallback(
    async ({
      channelId,
      workspaceSlug,
      content,
      attachmentIds = [],
      attachments = [],
      parentMessageId,
    }: SendMessageInput) => {
      if (!user) return false;

      if (isGallery) {
        const timestamp = new Date().toISOString();
        const currentUserId = asUserId(user.id);
        const currentUserName = state.workspaces.length > 0 ? "You" : "Demo User";
        const nextMessage: Message = {
          id: asMessageId(`demo-msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
          channelId: asChannelId(channelId),
          userId: currentUserId,
          senderDisplayName: currentUserName,
          senderAvatarUrl: null,
          content,
          parentMessageId: parentMessageId ? asMessageId(parentMessageId) : null,
          replyCount: 0,
          latestReplyAt: null,
          attachments,
          reactions: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        dispatch({ type: "mutations/error", error: null });
        dispatch({ type: "messages/upsert", message: nextMessage });

        if (parentMessageId) {
          dispatch({
            type: "messages/updateThreadSummary",
            channelId: asChannelId(channelId),
            parentMessageId: asMessageId(parentMessageId),
            replyCount: (state.messagesById[parentMessageId]?.replyCount ?? 0) + 1,
            latestReplyAt: timestamp,
          });
        }

        // Showcase reactions after sending: spaced-out lightweight bot feedback.
        let stagedReactions: ReactionGroup[] = [];
        window.setTimeout(() => {
          stagedReactions = [...stagedReactions, { emoji: "👍", count: 1, userIds: [asUserId("user-alice")] }];
          dispatch({ type: "messages/updateReactions", messageId: nextMessage.id, reactions: stagedReactions });
        }, 1500);

        window.setTimeout(() => {
          stagedReactions = [...stagedReactions, { emoji: "🚀", count: 1, userIds: [asUserId("user-bob")] }];
          dispatch({ type: "messages/updateReactions", messageId: nextMessage.id, reactions: stagedReactions });
        }, 3200);

        return true;
      }

      try {
        dispatch({ type: "mutations/error", error: null });
        if (parentMessageId) {
          await authorizedRequest(user, (headers) =>
            api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post(
              {
                param: { slug: workspaceSlug, id: channelId, messageId: parentMessageId },
                json: { content, attachmentIds },
              },
              { headers },
            ),
          );
        } else {
          await authorizedRequest(user, (headers) =>
            api.api.workspaces[":slug"].channels[":id"].messages.$post(
              {
                param: { slug: workspaceSlug, id: channelId },
                json: { content, attachmentIds },
              },
              { headers },
            ),
          );
        }
        return true;
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return false;
        }

        dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to send message") });
        return false;
      }
    },
    [dispatch, isGallery, state.messagesById, user],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!user) return;

      if (isGallery) {
        const existing = state.messagesById[messageId];
        if (existing) {
          dispatch({ type: "messages/upsert", message: { ...existing, content, updatedAt: new Date().toISOString() } });
        }
        return;
      }

      try {
        dispatch({ type: "mutations/error", error: null });
        await authorizedRequest(user, (headers) =>
          api.api.messages[":id"].$put(
            { param: { id: messageId }, json: { content } },
            { headers },
          ),
        );
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }
        dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to edit message") });
      }
    },
    [dispatch, isGallery, state.messagesById, user],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) return;

      const existing = state.messagesById[messageId];

      if (isGallery) {
        if (existing) {
          dispatch({ type: "messages/delete", messageId, channelId: existing.channelId });
        }
        return;
      }

      try {
        dispatch({ type: "mutations/error", error: null });
        await authorizedRequest(user, (headers) =>
          api.api.messages[":id"].$delete(
            { param: { id: messageId } },
            { headers },
          ),
        );
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }
        dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to delete message") });
      }
    },
    [dispatch, isGallery, state.messagesById, user],
  );

  return {
    toggleReaction,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
