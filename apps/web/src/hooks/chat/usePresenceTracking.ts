import { useCallback } from "react";
import { handlePresenceSync, handlePresenceUpdate, handleUserStatusUpdated } from "@openslaq/client-core";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";

export function usePresenceTracking() {
  const { dispatch } = useChatStore();

  const onSync = useCallback(
    (payload: {
      users: Array<{
        userId: string;
        status: "online" | "offline";
        lastSeenAt: string | null;
        statusEmoji?: string | null;
        statusText?: string | null;
        statusExpiresAt?: string | null;
      }>;
    }) => {
      dispatch(handlePresenceSync(payload));
    },
    [dispatch],
  );

  const onUpdated = useCallback(
    (payload: {
      userId: string;
      status: "online" | "offline";
      lastSeenAt: string | null;
    }) => {
      dispatch(handlePresenceUpdate(payload));
    },
    [dispatch],
  );

  const onStatusUpdated = useCallback(
    (payload: {
      userId: string;
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    }) => {
      dispatch(handleUserStatusUpdated(payload));
    },
    [dispatch],
  );

  useSocketEvent("presence:sync", onSync);
  useSocketEvent("presence:updated", onUpdated);
  useSocketEvent("user:statusUpdated", onStatusUpdated);
}
