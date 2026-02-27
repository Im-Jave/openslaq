import { useEffect } from "react";
import { loadThreadMessages } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useThreadMessages(
  workspaceSlug: string | undefined,
  channelId: string,
  parentMessageId: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();

  useEffect(() => {
    if (isGallery || !workspaceSlug || !channelId || !parentMessageId) return;
    let cancelled = false;

    const deps = { api, auth, dispatch, getState: () => state };
    void loadThreadMessages(deps, { workspaceSlug, channelId, parentMessageId }).then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dispatch, isGallery, parentMessageId, auth, workspaceSlug]);
}
