import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { loadOlderReplies } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useLoadMoreReplies(channelId: string, parentMessageId: string) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const auth = useAuthProvider();

  const pagination = state.threadPagination[parentMessageId];
  const hasOlder = pagination?.hasOlder ?? false;
  const loadingOlder = pagination?.loadingOlder ?? false;

  const loadOlder = useCallback(async () => {
    if (isGallery || !workspaceSlug || !pagination?.olderCursor || loadingOlder || !hasOlder) return;

    const deps = { api, auth, dispatch, getState: () => state };
    void loadOlderReplies(deps, { workspaceSlug, channelId, parentMessageId, cursor: pagination.olderCursor });
  }, [isGallery, auth, workspaceSlug, channelId, parentMessageId, pagination?.olderCursor, loadingOlder, hasOlder, dispatch, state]);

  return { loadOlder, loadingOlder, hasOlder };
}
