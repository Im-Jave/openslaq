import { useEffect, useRef } from "react";
import { loadChannelMessages } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useChannelMessages(
  workspaceSlug: string | undefined,
  channelId: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();
  // Use a ref so the effect can read the latest value without re-firing when
  // scrollTarget is cleared (which would overwrite the "around" messages).
  const scrollTargetRef = useRef(state.scrollTarget);
  scrollTargetRef.current = state.scrollTarget;

  useEffect(() => {
    // Skip fetching latest messages when a scrollTarget is active —
    // useScrollToMessage will load messages around the target instead.
    if (isGallery || !workspaceSlug || !channelId || scrollTargetRef.current) return;
    let cancelled = false;

    const deps = { api, auth, dispatch, getState: () => state };
    void loadChannelMessages(deps, { workspaceSlug, channelId }).then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dispatch, isGallery, auth, workspaceSlug]);
}
