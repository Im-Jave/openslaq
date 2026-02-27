import { useState, useEffect, useCallback, useRef } from "react";
import type { AllUnreadsResponse, Message } from "@openslaq/shared";
import { fetchAllUnreads, markAllAsRead, markChannelAsRead } from "@openslaq/client-core";
import { useChatStore } from "../../state/chat-store";
import { useAuthProvider } from "../../lib/api-client";
import { api } from "../../api";
import { useSocketEvent } from "../useSocketEvent";

export function useAllUnreads(workspaceSlug: string | undefined) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const [data, setData] = useState<AllUnreadsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = state.activeView === "unreads";
  const fetchedRef = useRef(false);

  const deps = { api, auth, dispatch, getState: () => state };

  const refresh = useCallback(async () => {
    if (!workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllUnreads(deps, { workspaceSlug });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load unreads");
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when view becomes active
  useEffect(() => {
    if (isActive && workspaceSlug) {
      fetchedRef.current = true;
      void refresh();
    }
    if (!isActive) {
      fetchedRef.current = false;
    }
  }, [isActive, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const markChannelRead = useCallback(
    async (channelId: string) => {
      if (!workspaceSlug) return;
      await markChannelAsRead(deps, { workspaceSlug, channelId });
      dispatch({ type: "unread/clear", channelId });
      setData((prev) =>
        prev
          ? {
              ...prev,
              channels: prev.channels.filter((g) => g.channelId !== channelId),
            }
          : prev,
      );
    },
    [workspaceSlug, auth, dispatch], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const markAllRead = useCallback(async () => {
    if (!workspaceSlug) return;
    await markAllAsRead(deps, { workspaceSlug });
    setData({ channels: [], threadMentions: [] });
  }, [workspaceSlug, auth, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for new messages to append in real-time
  useSocketEvent("message:new", useCallback((msg: Message) => {
    if (!isActive || !data || msg.parentMessageId) return;
    setData((prev) => {
      if (!prev) return prev;
      const group = prev.channels.find((g) => g.channelId === msg.channelId);
      if (group) {
        return {
          ...prev,
          channels: prev.channels.map((g) =>
            g.channelId === msg.channelId
              ? { ...g, messages: [...g.messages, msg] }
              : g,
          ),
        };
      }
      // New channel group — we don't have the channel name here, so refresh
      void refresh();
      return prev;
    });
  }, [isActive, data, refresh]));

  return { data, loading, error, refresh, markChannelRead, markAllRead };
}
