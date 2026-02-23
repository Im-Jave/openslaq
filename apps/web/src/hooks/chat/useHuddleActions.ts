import { useCallback } from "react";
import type { ChannelId } from "@openslack/shared";
import { useSocket } from "../useSocket";
import { useChatStore } from "../../state/chat-store";

export function useHuddleActions() {
  const { socket } = useSocket();
  const { state, dispatch } = useChatStore();

  const startHuddle = useCallback(
    (channelId: string) => {
      if (!socket) return;
      socket.emit("huddle:start", { channelId: channelId as ChannelId });
      dispatch({ type: "huddle/setCurrentChannel", channelId });
    },
    [socket, dispatch],
  );

  const joinHuddle = useCallback(
    (channelId: string) => {
      if (!socket) return;
      socket.emit("huddle:join", { channelId: channelId as ChannelId });
      dispatch({ type: "huddle/setCurrentChannel", channelId });
    },
    [socket, dispatch],
  );

  const leaveHuddle = useCallback(() => {
    if (!socket) return;
    socket.emit("huddle:leave");
    dispatch({ type: "huddle/setCurrentChannel", channelId: null });
  }, [socket, dispatch]);

  const toggleMute = useCallback(
    (isMuted: boolean) => {
      if (!socket) return;
      socket.emit("huddle:mute", { isMuted });
    },
    [socket],
  );

  return {
    startHuddle,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    currentHuddleChannelId: state.currentHuddleChannelId,
  };
}
