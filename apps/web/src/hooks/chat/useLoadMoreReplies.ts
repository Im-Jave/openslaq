import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCurrentUser } from "../useCurrentUser";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useLoadMoreReplies(channelId: string, parentMessageId: string) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  const pagination = state.threadPagination[parentMessageId];
  const hasNewer = pagination?.hasNewer ?? false;
  const loadingNewer = pagination?.loadingNewer ?? false;

  const loadMore = useCallback(async () => {
    if (isGallery || !user || !workspaceSlug || !pagination?.newerCursor || loadingNewer || !hasNewer) return;

    dispatch({ type: "thread/setLoadingNewer", parentMessageId, loading: true });

    try {
      const response = await authorizedRequest(user, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get(
          {
            param: { slug: workspaceSlug, id: channelId, messageId: parentMessageId },
            query: { cursor: pagination.newerCursor! },
          },
          { headers },
        ),
      );
      const data = await response.json();
      dispatch({
        type: "thread/appendReplies",
        parentMessageId,
        replies: data.messages,
        newerCursor: data.nextCursor,
        hasNewer: data.nextCursor !== null,
      });
    } catch {
      dispatch({ type: "thread/setLoadingNewer", parentMessageId, loading: false });
    }
  }, [isGallery, user, workspaceSlug, channelId, parentMessageId, pagination?.newerCursor, loadingNewer, hasNewer, dispatch]);

  return { loadMore, loadingNewer, hasNewer };
}
