import { useCallback } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError } from "../../lib/errors";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useInvitesApi(user: AuthJsonUser | null | undefined) {
  const getInvite = useCallback(
    async (code: string): Promise<{ workspaceName: string; workspaceSlug: string }> => {
      if (!user) {
        throw new Error("Authentication required");
      }

      try {
        const response = await authorizedRequest(user, (headers) =>
          api.api.invites[":code"].$get({ param: { code } }, { headers }),
        );
        return (await response.json()) as { workspaceName: string; workspaceSlug: string };
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
        }
        throw err;
      }
    },
    [user],
  );

  const acceptInvite = useCallback(
    async (code: string): Promise<{ slug: string }> => {
      if (!user) {
        throw new Error("Authentication required");
      }

      try {
        const response = await authorizedRequest(user, (headers) =>
          api.api.invites[":code"].accept.$post({ param: { code } }, { headers }),
        );
        return (await response.json()) as { slug: string };
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
        }
        throw err;
      }
    },
    [user],
  );

  return {
    getInvite,
    acceptInvite,
  };
}
