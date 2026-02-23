import { useCallback } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError } from "../../lib/errors";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export function useWorkspaceMembersApi(user: AuthJsonUser | null | undefined) {
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();

  const listMembers = useCallback(
    async (workspaceSlug: string): Promise<Member[]> => {
      if (isGallery) {
        return (galleryMockData?.members ?? []) as Member[];
      }
      if (!user) return [];
      try {
        const response = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].members.$get({ param: { slug: workspaceSlug } }, { headers }),
        );
        return (await response.json()) as Member[];
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
        }
        throw err;
      }
    },
    [galleryMockData?.members, isGallery, user],
  );

  const updateRole = useCallback(
    async (workspaceSlug: string, userId: string, role: string): Promise<void> => {
      if (!user) return;
      try {
        await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].members[":userId"].role.$patch(
            { param: { slug: workspaceSlug, userId }, json: { role: role as "member" | "admin" } },
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
    async (workspaceSlug: string, userId: string): Promise<void> => {
      if (!user) return;
      try {
        await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].members[":userId"].$delete(
            { param: { slug: workspaceSlug, userId } },
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

  const deleteWorkspace = useCallback(
    async (workspaceSlug: string): Promise<void> => {
      if (!user) return;
      try {
        await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].$delete({ param: { slug: workspaceSlug } }, { headers }),
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

  return {
    listMembers,
    updateRole,
    removeMember,
    deleteWorkspace,
  };
}
