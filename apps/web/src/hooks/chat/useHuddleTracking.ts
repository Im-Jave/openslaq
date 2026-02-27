import { useCallback } from "react";
import type { HuddleState, ChannelId } from "@openslaq/shared";
import {
  handleHuddleSync,
  handleHuddleStarted,
  handleHuddleUpdated,
  handleHuddleEnded,
} from "@openslaq/client-core";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";

export function useHuddleTracking() {
  const { dispatch } = useChatStore();

  const onSync = useCallback(
    (payload: { huddles: HuddleState[] }) => dispatch(handleHuddleSync(payload)),
    [dispatch],
  );

  const onStarted = useCallback(
    (huddle: HuddleState) => dispatch(handleHuddleStarted(huddle)),
    [dispatch],
  );

  const onUpdated = useCallback(
    (huddle: HuddleState) => dispatch(handleHuddleUpdated(huddle)),
    [dispatch],
  );

  const onEnded = useCallback(
    (payload: { channelId: ChannelId }) => dispatch(handleHuddleEnded(payload)),
    [dispatch],
  );

  useSocketEvent("huddle:sync", onSync);
  useSocketEvent("huddle:started", onStarted);
  useSocketEvent("huddle:updated", onUpdated);
  useSocketEvent("huddle:ended", onEnded);
}
