import { useCallback } from "react";
import { asChannelId, asUserId } from "@openslack/shared";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { useChatStore, type DmConversation } from "../../state/chat-store";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface AuthJsonUser {
  id: string;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useDmActions(user: AuthJsonUser | null | undefined, workspaceSlug?: string) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const mockData = useGalleryMockData();

  const createDm = useCallback(
    async (targetUserId: string): Promise<DmConversation | null> => {
      if (!user || !workspaceSlug) return null;

      if (isGallery) {
        const existing = state.dms.find((dm) => dm.otherUser.id === targetUserId);
        if (existing) {
          dispatch({ type: "workspace/selectDm", channelId: existing.channel.id });
          return existing;
        }

        const targetMember = mockData?.members?.find((member) => member.id === targetUserId);
        if (!targetMember) {
          dispatch({ type: "mutations/error", error: "Could not create DM in demo mode" });
          return null;
        }

        const workspaceId = state.workspaces[0]?.id;
        if (!workspaceId) {
          dispatch({ type: "mutations/error", error: "No workspace available in demo mode" });
          return null;
        }

        const dm: DmConversation = {
          channel: {
            id: asChannelId(`demo-dm-${targetUserId}`),
            workspaceId,
            name: "dm",
            type: "dm",
            description: null,
            createdBy: asUserId(user.id),
            createdAt: new Date().toISOString(),
          },
          otherUser: {
            id: asUserId(targetMember.id),
            displayName: targetMember.displayName,
            avatarUrl: targetMember.avatarUrl,
          },
        };

        dispatch({ type: "workspace/addDm", dm });
        dispatch({ type: "workspace/selectDm", channelId: dm.channel.id });
        dispatch({ type: "mutations/error", error: null });
        return dm;
      }

      try {
        dispatch({ type: "mutations/error", error: null });
        const response = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].dm.$post(
            { param: { slug: workspaceSlug }, json: { userId: targetUserId } },
            { headers },
          ),
        );

        const data = await response.json();
        if (!("channel" in data) || !data.otherUser) {
          return null;
        }

        const newDm: DmConversation = { channel: data.channel, otherUser: data.otherUser };
        dispatch({ type: "workspace/addDm", dm: newDm });
        dispatch({ type: "workspace/selectDm", channelId: data.channel.id });
        return newDm;
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return null;
        }

        dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to create DM") });
        return null;
      }
    },
    [dispatch, isGallery, mockData?.members, state.dms, state.workspaces, user, workspaceSlug],
  );

  return { createDm };
}
