import { useEffect, useRef } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useChannelMessages(
  user: AuthJsonUser | null | undefined,
  workspaceSlug: string | undefined,
  channelId: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  // Use a ref so the effect can read the latest value without re-firing when
  // scrollTarget is cleared (which would overwrite the "around" messages).
  const scrollTargetRef = useRef(state.scrollTarget);
  scrollTargetRef.current = state.scrollTarget;

  useEffect(() => {
    // Skip fetching latest messages when a scrollTarget is active —
    // useScrollToMessage will load messages around the target instead.
    if (isGallery) return;
    if (!user || !workspaceSlug || !channelId || scrollTargetRef.current) return;
    const slug = workspaceSlug;
    let cancelled = false;

    async function run() {
      dispatch({ type: "channel/loadStart", channelId });
      try {
        const response = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].channels[":id"].messages.$get(
            { param: { slug, id: channelId }, query: {} },
            { headers },
          ),
        );
        const data = await response.json();
        if (cancelled) return;
        dispatch({
          type: "channel/setMessages",
          channelId,
          messages: [...data.messages].reverse(),
          olderCursor: data.nextCursor,
          newerCursor: null,
          hasOlder: data.nextCursor !== null,
          hasNewer: false,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }
        dispatch({
          type: "channel/loadError",
          channelId,
          error: getErrorMessage(err, "Failed to load messages"),
        });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [channelId, dispatch, isGallery, user, workspaceSlug]);
}
