import { useEffect } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useThreadMessages(
  user: AuthJsonUser | null | undefined,
  workspaceSlug: string | undefined,
  channelId: string,
  parentMessageId: string,
) {
  const { dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  useEffect(() => {
    if (isGallery) return;
    if (!user || !workspaceSlug || !channelId || !parentMessageId) return;
    const slug = workspaceSlug;
    let cancelled = false;

    async function run() {
      dispatch({ type: "thread/loadStart", parentMessageId });

      try {
        const [parentRes, repliesRes] = await Promise.all([
          authorizedRequest(user, (headers) =>
            api.api.messages[":id"].$get({ param: { id: parentMessageId } }, { headers }),
          ),
          authorizedRequest(user, (headers) =>
            api.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get(
              { param: { slug, id: channelId, messageId: parentMessageId }, query: {} },
              { headers },
            ),
          ),
        ]);

        if (cancelled) return;
        const parentData = await parentRes.json();
        const repliesData = await repliesRes.json();

        if (!("id" in parentData)) {
          dispatch({ type: "thread/loadError", parentMessageId, error: "Thread not found" });
          return;
        }

        dispatch({
          type: "thread/setData",
          parent: parentData,
          replies: repliesData.messages,
          newerCursor: repliesData.nextCursor,
          hasNewer: repliesData.nextCursor !== null,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }
        dispatch({
          type: "thread/loadError",
          parentMessageId,
          error: getErrorMessage(err, "Failed to load thread"),
        });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [channelId, dispatch, isGallery, parentMessageId, user, workspaceSlug]);
}
