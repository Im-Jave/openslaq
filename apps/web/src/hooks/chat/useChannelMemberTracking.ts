import { useCallback } from "react";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../useCurrentUser";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import type { Channel, ChannelId, UserId } from "@openslack/shared";
import { useSocket } from "../useSocket";

export function useChannelMemberTracking(workspaceSlug?: string) {
  const { dispatch } = useChatStore();
  const user = useCurrentUser();
  const { socket } = useSocket();

  const handleMemberAdded = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      if (!user || payload.userId !== user.id) return;

      // Current user was added to a private channel — re-fetch channels to add it
      if (!workspaceSlug) return;
      void (async () => {
        const res = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].channels.$get(
            { param: { slug: workspaceSlug } },
            { headers },
          ),
        );
        const channels = (await res.json()) as Channel[];
        const newChannel = channels.find((c) => c.id === payload.channelId);
        if (newChannel) {
          dispatch({ type: "workspace/addChannel", channel: newChannel });
          // Join the socket room for the new channel
          socket?.emit("channel:join", { channelId: payload.channelId });
        }
      })();
    },
    [user, workspaceSlug, dispatch, socket],
  );

  const handleMemberRemoved = useCallback(
    (payload: { channelId: ChannelId; userId: UserId }) => {
      if (!user || payload.userId !== user.id) return;

      // Current user was removed from a private channel
      dispatch({ type: "workspace/removeChannel", channelId: payload.channelId });
      socket?.emit("channel:leave", { channelId: payload.channelId });
    },
    [user, dispatch, socket],
  );

  useSocketEvent("channel:member-added", handleMemberAdded);
  useSocketEvent("channel:member-removed", handleMemberRemoved);
}
