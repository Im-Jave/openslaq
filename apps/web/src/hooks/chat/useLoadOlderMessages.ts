import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCurrentUser } from "../useCurrentUser";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

export function useLoadOlderMessages(channelId: string) {
  const user = useCurrentUser();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  const pagination = state.channelPagination[channelId];
  const hasOlder = pagination?.hasOlder ?? false;
  const loadingOlder = pagination?.loadingOlder ?? false;

  const loadOlder = useCallback(async () => {
    if (isGallery || !user || !workspaceSlug || !pagination?.olderCursor || loadingOlder || !hasOlder) return;

    dispatch({ type: "channel/setLoadingOlder", channelId, loading: true });

    try {
      const response = await authorizedRequest(user, (headers) =>
        api.api.workspaces[":slug"].channels[":id"].messages.$get(
          {
            param: { slug: workspaceSlug, id: channelId },
            query: { cursor: pagination.olderCursor!, direction: "older" },
          },
          { headers },
        ),
      );
      const data = await response.json();
      dispatch({
        type: "channel/prependMessages",
        channelId,
        messages: [...data.messages].reverse(),
        olderCursor: data.nextCursor,
        hasOlder: data.nextCursor !== null,
      });
    } catch {
      dispatch({ type: "channel/setLoadingOlder", channelId, loading: false });
    }
  }, [isGallery, user, workspaceSlug, channelId, pagination?.olderCursor, loadingOlder, hasOlder, dispatch]);

  return { loadOlder, loadingOlder, hasOlder };
}
