import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCurrentUser } from "../useCurrentUser";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useLoadNewerMessages(channelId: string) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  const pagination = state.channelPagination[channelId];
  const hasNewer = pagination?.hasNewer ?? false;
  const loadingNewer = pagination?.loadingNewer ?? false;

  const loadNewer = useCallback(async () => {
    if (isGallery || !user || !workspaceSlug || !pagination?.newerCursor || loadingNewer || !hasNewer) return;

    dispatch({ type: "channel/setLoadingNewer", channelId, loading: true });

    try {
      const response = await authorizedRequest(user, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages.$get(
          {
            param: { slug: workspaceSlug, id: channelId },
            query: { cursor: pagination.newerCursor!, direction: "newer" },
          },
          { headers },
        ),
      );
      const data = await response.json();
      dispatch({
        type: "channel/appendMessages",
        channelId,
        messages: data.messages,
        newerCursor: data.nextCursor,
        hasNewer: data.nextCursor !== null,
      });
    } catch {
      dispatch({ type: "channel/setLoadingNewer", channelId, loading: false });
    }
  }, [isGallery, user, workspaceSlug, channelId, pagination?.newerCursor, loadingNewer, hasNewer, dispatch]);

  return { loadNewer, loadingNewer, hasNewer };
}
