import type { Message, ReactionGroup } from "@openslaq/shared";
import { asUserId } from "@openslaq/shared";
import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { OperationDeps } from "./types";

interface ToggleReactionParams {
  messageId: string;
  emoji: string;
  userId: string;
}

export async function toggleReaction(
  deps: OperationDeps,
  params: ToggleReactionParams,
): Promise<void> {
  const { api, auth, dispatch, getState } = deps;
  const { messageId, emoji, userId } = params;

  const state = getState();
  const existing = state.messagesById[messageId];
  const previousReactions: ReactionGroup[] = existing?.reactions ?? [];

  if (existing) {
    const currentUserId = asUserId(userId);
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

  try {
    dispatch({ type: "mutations/error", error: null });
    await authorizedRequest(auth, (headers) =>
      api.api.messages[":id"].reactions.$post(
        { param: { id: messageId }, json: { emoji } },
        { headers },
      ),
    );
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
      return;
    }

    if (existing) {
      dispatch({ type: "messages/updateReactions", messageId, reactions: previousReactions });
    }
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to update reaction") });
  }
}

interface SendMessageParams {
  channelId: string;
  workspaceSlug: string;
  content: string;
  attachmentIds?: string[];
  parentMessageId?: string | null;
}

export async function sendMessage(
  deps: OperationDeps,
  params: SendMessageParams,
): Promise<boolean> {
  const { api, auth, dispatch } = deps;
  const { channelId, workspaceSlug, content, attachmentIds = [], parentMessageId } = params;

  try {
    dispatch({ type: "mutations/error", error: null });
    let response;
    if (parentMessageId) {
      response = await authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post(
          {
            param: { slug: workspaceSlug, id: channelId, messageId: parentMessageId },
            json: { content, attachmentIds },
          },
          { headers },
        ),
      );
    } else {
      response = await authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages.$post(
          {
            param: { slug: workspaceSlug, id: channelId },
            json: { content, attachmentIds },
          },
          { headers },
        ),
      );
    }

    const message = (await response.json()) as Message;
    dispatch({ type: "messages/upsert", message });

    return true;
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
      return false;
    }
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to send message") });
    return false;
  }
}

export async function editMessage(
  deps: OperationDeps,
  params: { messageId: string; content: string },
): Promise<void> {
  const { api, auth, dispatch } = deps;

  try {
    dispatch({ type: "mutations/error", error: null });
    const response = await authorizedRequest(auth, (headers) =>
      api.api.messages[":id"].$put(
        { param: { id: params.messageId }, json: { content: params.content } },
        { headers },
      ),
    );

    const message = (await response.json()) as Message;
    dispatch({ type: "messages/upsert", message });
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
      return;
    }
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to edit message") });
  }
}

export async function deleteMessage(
  deps: OperationDeps,
  params: { messageId: string },
): Promise<void> {
  const { api, auth, dispatch, getState } = deps;
  const message = getState().messagesById[params.messageId];

  try {
    dispatch({ type: "mutations/error", error: null });
    await authorizedRequest(auth, (headers) =>
      api.api.messages[":id"].$delete(
        { param: { id: params.messageId } },
        { headers },
      ),
    );

    if (message) {
      dispatch({ type: "messages/delete", messageId: params.messageId, channelId: message.channelId });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
      return;
    }
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to delete message") });
  }
}
