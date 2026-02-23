import { useCallback, useEffect } from "react";
import type { Message } from "@openslack/shared";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { useGalleryMode } from "../../gallery/gallery-context";

interface AuthJsonUser {
  id: string;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useUnreadTracking(user: AuthJsonUser | null | undefined, workspaceSlug?: string) {
  const { state, dispatch } = useChatStore();

  const handleNewMessage = useCallback(
    (message: Message) => {
      // Only count top-level messages (not thread replies)
      if (message.parentMessageId) return;

      // Don't count own messages as unread
      if (user && message.userId === user.id) return;

      // Only increment if the message is for a non-active channel
      const activeId = state.activeChannelId ?? state.activeDmId;
      if (message.channelId === activeId) return;

      dispatch({ type: "unread/increment", channelId: message.channelId });
    },
    [state.activeChannelId, state.activeDmId, dispatch, user],
  );

  useSocketEvent("message:new", handleNewMessage);

  // Mark-as-read when user views a channel/DM
  const activeChannelId = state.activeChannelId;
  const activeDmId = state.activeDmId;
  const isGallery = useGalleryMode();

  useEffect(() => {
    if (isGallery) return;
    const channelId = activeChannelId ?? activeDmId;
    if (!channelId || !user || !workspaceSlug) return;

    void authorizedRequest(user, (headers) =>
      api.api.workspaces[":slug"].channels[":id"].read.$post(
        { param: { slug: workspaceSlug, id: channelId } },
        { headers },
      ),
    );
  }, [activeChannelId, activeDmId, isGallery, user, workspaceSlug]);
}
