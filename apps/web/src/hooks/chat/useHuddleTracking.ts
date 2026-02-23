import { useCallback } from "react";
import type { HuddleState, ChannelId } from "@openslack/shared";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";

export function useHuddleTracking() {
  const { dispatch } = useChatStore();

  const handleSync = useCallback(
    (payload: { huddles: HuddleState[] }) => {
      dispatch({ type: "huddle/sync", huddles: payload.huddles });
    },
    [dispatch],
  );

  const handleStarted = useCallback(
    (huddle: HuddleState) => {
      dispatch({ type: "huddle/started", huddle });
    },
    [dispatch],
  );

  const handleUpdated = useCallback(
    (huddle: HuddleState) => {
      dispatch({ type: "huddle/updated", huddle });
    },
    [dispatch],
  );

  const handleEnded = useCallback(
    (payload: { channelId: ChannelId }) => {
      dispatch({ type: "huddle/ended", channelId: payload.channelId });
    },
    [dispatch],
  );

  useSocketEvent("huddle:sync", handleSync);
  useSocketEvent("huddle:started", handleStarted);
  useSocketEvent("huddle:updated", handleUpdated);
  useSocketEvent("huddle:ended", handleEnded);
}
