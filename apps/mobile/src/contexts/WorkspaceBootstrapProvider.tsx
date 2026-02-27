import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import type { Channel, ChannelId, Message, MessageId, UserId } from "@openslaq/shared";
import {
  bootstrapWorkspace,
  handlePresenceSync,
  handlePresenceUpdate,
  handleNewMessageUnread,
  markChannelAsRead,
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
  normalizeChannel,
} from "@openslaq/client-core";
import { useAuth } from "./AuthContext";
import { useChatStore } from "./ChatStoreProvider";
import { useSocket } from "./SocketProvider";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { api } from "../lib/api";

interface Props {
  workspaceSlug: string;
  children: ReactNode;
}

export function WorkspaceBootstrapProvider({
  workspaceSlug,
  children,
}: Props) {
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const { socket } = useSocket();

  // Bootstrap workspace on mount
  useEffect(() => {
    if (!workspaceSlug) return;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void bootstrapWorkspace(deps, { workspaceSlug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, authProvider, workspaceSlug]);

  // Presence tracking
  const onPresenceSync = useCallback(
    (payload: {
      users: Array<{
        userId: string;
        status: "online" | "offline";
        lastSeenAt: string | null;
      }>;
    }) => {
      dispatch(handlePresenceSync(payload));
    },
    [dispatch],
  );

  const onPresenceUpdated = useCallback(
    (payload: {
      userId: string;
      status: "online" | "offline";
      lastSeenAt: string | null;
    }) => {
      dispatch(handlePresenceUpdate(payload));
    },
    [dispatch],
  );

  useSocketEvent("presence:sync", onPresenceSync);
  useSocketEvent("presence:updated", onPresenceUpdated);

  // Unread tracking
  const onNewMessage = useCallback(
    (message: Message) => {
      if (!user) return;
      const action = handleNewMessageUnread(message, {
        currentUserId: user.id,
        activeChannelId: state.activeChannelId,
        activeDmId: state.activeDmId,
      });
      if (action) dispatch(action);
    },
    [state.activeChannelId, state.activeDmId, dispatch, user],
  );

  useSocketEvent("message:new", onNewMessage);

  // Mark-as-read when channel changes
  useEffect(() => {
    const channelId = state.activeChannelId ?? state.activeDmId;
    if (!channelId || !workspaceSlug) return;
    const deps = { api, auth: authProvider, dispatch, getState: () => state };
    void markChannelAsRead(deps, { workspaceSlug, channelId });
  }, [state.activeChannelId, state.activeDmId, authProvider, dispatch, state, workspaceSlug]);

  // Channel member tracking
  const onMemberAdded = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      if (!user || !workspaceSlug) return;
      const deps = { api, auth: authProvider, dispatch, getState: () => state };
      void handleChannelMemberAdded(deps, {
        socket,
        channelId: payload.channelId,
        userId: payload.userId,
        currentUserId: user.id,
        workspaceSlug,
      });
    },
    [authProvider, dispatch, socket, state, user, workspaceSlug],
  );

  const onMemberRemoved = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      if (!user) return;
      handleChannelMemberRemoved(dispatch, {
        socket,
        channelId: payload.channelId,
        userId: payload.userId,
        currentUserId: user.id,
      });
    },
    [dispatch, socket, user],
  );

  useSocketEvent("channel:member-added", onMemberAdded);
  useSocketEvent("channel:member-removed", onMemberRemoved);

  // Channel updated tracking
  const onChannelUpdated = useCallback(
    (payload: { channelId: ChannelId; channel: Channel }) => {
      const channel = normalizeChannel(payload.channel as Parameters<typeof normalizeChannel>[0]);
      dispatch({ type: "workspace/updateChannel", channel });
    },
    [dispatch],
  );

  useSocketEvent("channel:updated", onChannelUpdated);

  // Thread summary tracking
  const onThreadUpdated = useCallback(
    (payload: {
      parentMessageId: MessageId;
      channelId: ChannelId;
      replyCount: number;
      latestReplyAt: string;
    }) => {
      dispatch({
        type: "messages/updateThreadSummary",
        channelId: payload.channelId,
        parentMessageId: payload.parentMessageId,
        replyCount: payload.replyCount,
        latestReplyAt: payload.latestReplyAt,
      });
    },
    [dispatch],
  );

  useSocketEvent("thread:updated", onThreadUpdated);

  return <>{children}</>;
}
