import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { loadNewerMessages } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useLoadNewerMessages(channelId: string) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();

  const pagination = state.channelPagination[channelId];
  const hasNewer = pagination?.hasNewer ?? false;
  const loadingNewer = pagination?.loadingNewer ?? false;

  const loadNewer = useCallback(async () => {
    if (isGallery || !workspaceSlug || !pagination?.newerCursor || loadingNewer || !hasNewer) return;

    const deps = { api, auth, dispatch, getState: () => state };
    void loadNewerMessages(deps, { workspaceSlug, channelId, cursor: pagination.newerCursor });
  }, [isGallery, auth, workspaceSlug, channelId, pagination?.newerCursor, loadingNewer, hasNewer, dispatch, state]);

  return { loadNewer, loadingNewer, hasNewer };
}
