import { useEffect } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { redirectToAuth } from "../../lib/auth";
import { useChatStore, type DmConversation, type WorkspaceInfo } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import type { Channel } from "@openslack/shared";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useWorkspaceBootstrap(
  user: AuthJsonUser | null | undefined,
  workspaceSlug?: string,
  urlChannelId?: string,
  urlDmChannelId?: string,
) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();

  useEffect(() => {
    if (isGallery) return;
    if (!user || !workspaceSlug) return;
    const slug = workspaceSlug;

    let cancelled = false;

    async function run() {
      dispatch({ type: "workspace/bootstrapStart", workspaceSlug: slug });

      try {
        const channelsPromise = authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].channels.$get({ param: { slug } }, { headers }),
        );
        const workspacesPromise = authorizedRequest(user, (headers) =>
          api.api.workspaces.$get({}, { headers }),
        );
        const dmsPromise = authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].dm.$get({ param: { slug } }, { headers }),
        );
        const unreadPromise = authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"]["unread-counts"].$get({ param: { slug } }, { headers }),
        );
        const presencePromise = authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].presence.$get({ param: { slug } }, { headers }),
        );

        const [channelsRes, workspacesRes, dmsRes, unreadRes, presenceRes] = await Promise.all([
          channelsPromise,
          workspacesPromise,
          dmsPromise,
          unreadPromise,
          presencePromise,
        ]);

        if (cancelled) return;

        const unreadCounts = (await unreadRes.json()) as Record<string, number>;
        const presenceData = (await presenceRes.json()) as Array<{
          userId: string;
          online: boolean;
          lastSeenAt: string | null;
        }>;

        const channels = (await channelsRes.json()) as Channel[];
        const dmsData = (await dmsRes.json()) as DmConversation[];

        dispatch({
          type: "workspace/bootstrapSuccess",
          channels,
          workspaces: (await workspacesRes.json()) as WorkspaceInfo[],
          dms: dmsData,
        });
        dispatch({ type: "unread/setCounts", counts: unreadCounts });
        dispatch({ type: "presence/sync", users: presenceData });

        // Honor URL params, then fall back to #general (or first channel)
        if (urlDmChannelId && dmsData.some((dm) => dm.channel.id === urlDmChannelId)) {
          dispatch({ type: "workspace/selectDm", channelId: urlDmChannelId });
        } else if (urlChannelId && channels.some((c) => c.id === urlChannelId)) {
          dispatch({ type: "workspace/selectChannel", channelId: urlChannelId });
        } else if (!state.activeChannelId && !state.activeDmId) {
          const defaultChannel = channels.find((c) => c.name === "general") ?? channels[0];
          if (defaultChannel) {
            dispatch({ type: "workspace/selectChannel", channelId: defaultChannel.id });
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }

        dispatch({
          type: "workspace/bootstrapError",
          error: getErrorMessage(err, "Failed to load workspace data"),
        });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isGallery, user, workspaceSlug]);
}
