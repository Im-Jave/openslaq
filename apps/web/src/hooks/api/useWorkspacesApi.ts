import { useCallback } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError } from "../../lib/errors";
import type { Workspace, Role } from "@openslack/shared";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export interface WorkspaceInfo extends Workspace {
  role: Role;
  memberCount: number;
}

export function useWorkspacesApi(user: AuthJsonUser | null | undefined) {
  const listWorkspaces = useCallback(async (): Promise<WorkspaceInfo[]> => {
    if (!user) return [];
    try {
      const response = await authorizedRequest(user, (headers) => api.api.workspaces.$get({}, { headers }));
      return (await response.json()) as WorkspaceInfo[];
    } catch (err) {
      if (err instanceof AuthError) {
        redirectToAuth();
      }
      throw err;
    }
  }, [user]);

  const createWorkspace = useCallback(
    async (name: string): Promise<{ ok: true; slug: string } | { ok: false; error: string }> => {
      if (!user) {
        return { ok: false, error: "Authentication required" };
      }

      try {
        const response = await authorizedRequest(user, (headers) =>
          api.api.workspaces.$post({ json: { name } }, { headers }),
        );
        const data = (await response.json()) as { slug: string };
        return { ok: true, slug: data.slug };
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return { ok: false, error: "Authentication required" };
        }
        if (err instanceof Error) {
          return { ok: false, error: err.message };
        }
        return { ok: false, error: "Failed to create workspace" };
      }
    },
    [user],
  );

  return {
    listWorkspaces,
    createWorkspace,
  };
}
