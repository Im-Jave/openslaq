import { useCallback } from "react";
import { useSocketEvent } from "../useSocketEvent";
import { useChatStore } from "../../state/chat-store";

export function usePresenceTracking() {
  const { dispatch } = useChatStore();

  const handleSync = useCallback(
    (payload: {
      users: Array<{
        userId: string;
        status: "online" | "offline";
        lastSeenAt: string | null;
      }>;
    }) => {
      dispatch({
        type: "presence/sync",
        users: payload.users.map((u) => ({
          userId: u.userId,
          online: u.status === "online",
          lastSeenAt: u.lastSeenAt,
        })),
      });
    },
    [dispatch],
  );

  const handleUpdated = useCallback(
    (payload: {
      userId: string;
      status: "online" | "offline";
      lastSeenAt: string | null;
    }) => {
      dispatch({
        type: "presence/updated",
        userId: payload.userId,
        online: payload.status === "online",
        lastSeenAt: payload.lastSeenAt,
      });
    },
    [dispatch],
  );

  useSocketEvent("presence:sync", handleSync);
  useSocketEvent("presence:updated", handleUpdated);
}
