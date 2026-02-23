import { useCallback } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError } from "../../lib/errors";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export interface ChannelMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export function useChannelMembersApi(user: AuthJsonUser | null | undefined) {
  const isGallery = useGalleryMode();
  const mockData = useGalleryMockData();

  const listChannelMembers = useCallback(
    async (workspaceSlug: string, channelId: string): Promise<ChannelMember[]> => {
      if (isGallery) {
        return (mockData?.members ?? []).map((member) => ({
          id: member.id,
          displayName: member.displayName,
          email: member.email,
          avatarUrl: member.avatarUrl,
          joinedAt: member.joinedAt,
        }));
      }
      if (!user) return [];
      try {
        const response = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].channels[":id"].members.$get(
            { param: { slug: workspaceSlug, id: channelId } },
            { headers },
          ),
        );
        return (await response.json()) as ChannelMember[];
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
        }
        throw err;
      }
    },
    [isGallery, mockData?.members, user],
  );

  const addMember = useCallback(
    async (workspaceSlug: string, channelId: string, userId: string): Promise<void> => {
      if (!user) return;
      try {
        await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].channels[":id"].members.$post(
            { param: { slug: workspaceSlug, id: channelId }, json: { userId } },
            { headers },
          ),
        );
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }
        throw err;
      }
    },
    [user],
  );

  const removeMember = useCallback(
    async (workspaceSlug: string, channelId: string, userId: string): Promise<void> => {
      if (!user) return;
      try {
        await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete(
            { param: { slug: workspaceSlug, id: channelId, userId } },
            { headers },
          ),
        );
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }
        throw err;
      }
    },
    [user],
  );

  return { listChannelMembers, addMember, removeMember };
}
