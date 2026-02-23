import { useCallback } from "react";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { redirectToAuth } from "../../lib/auth";
import { AuthError } from "../../lib/errors";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useAdminApi(user: AuthJsonUser | null | undefined) {
  const checkAdmin = useCallback(async (): Promise<{ isAdmin: boolean }> => {
    if (!user) return { isAdmin: false };
    try {
      const res = await authorizedRequest(user, (headers) =>
        api.api.admin.check.$get({}, { headers }),
      );
      return (await res.json()) as { isAdmin: boolean };
    } catch (err) {
      if (err instanceof AuthError) redirectToAuth();
      throw err;
    }
  }, [user]);

  const getStats = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await authorizedRequest(user, (headers) =>
        api.api.admin.stats.$get({}, { headers }),
      );
      return (await res.json()) as {
        users: number;
        workspaces: number;
        channels: number;
        messages: number;
        attachments: number;
        reactions: number;
      };
    } catch (err) {
      if (err instanceof AuthError) redirectToAuth();
      throw err;
    }
  }, [user]);

  const getActivity = useCallback(
    async (days = 30) => {
      if (!user) return null;
      try {
        const res = await authorizedRequest(user, (headers) =>
          api.api.admin.activity.$get({ query: { days: String(days) } }, { headers }),
        );
        return (await res.json()) as {
          messagesPerDay: { date: string; count: number }[];
          usersPerDay: { date: string; count: number }[];
        };
      } catch (err) {
        if (err instanceof AuthError) redirectToAuth();
        throw err;
      }
    },
    [user],
  );

  const getUsers = useCallback(
    async (page = 1, pageSize = 20, search?: string) => {
      if (!user) return null;
      try {
        const query: Record<string, string> = {
          page: String(page),
          pageSize: String(pageSize),
        };
        if (search) query.search = search;
        const res = await authorizedRequest(user, (headers) =>
          api.api.admin.users.$get({ query }, { headers }),
        );
        return (await res.json()) as {
          users: {
            id: string;
            displayName: string;
            email: string;
            avatarUrl: string | null;
            lastSeenAt: string | null;
            createdAt: string;
            messageCount: number;
            workspaceCount: number;
          }[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      } catch (err) {
        if (err instanceof AuthError) redirectToAuth();
        throw err;
      }
    },
    [user],
  );

  const getWorkspaces = useCallback(
    async (page = 1, pageSize = 20, search?: string) => {
      if (!user) return null;
      try {
        const query: Record<string, string> = {
          page: String(page),
          pageSize: String(pageSize),
        };
        if (search) query.search = search;
        const res = await authorizedRequest(user, (headers) =>
          api.api.admin.workspaces.$get({ query }, { headers }),
        );
        return (await res.json()) as {
          workspaces: {
            id: string;
            name: string;
            slug: string;
            createdAt: string;
            memberCount: number;
            channelCount: number;
            messageCount: number;
          }[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      } catch (err) {
        if (err instanceof AuthError) redirectToAuth();
        throw err;
      }
    },
    [user],
  );

  const impersonate = useCallback(
    async (userId: string) => {
      if (!user) return null;
      try {
        const res = await authorizedRequest(user, (headers) =>
          api.api.admin.impersonate[":userId"].$post(
            { param: { userId } },
            { headers },
          ),
        );
        return (await res.json()) as { snippet: string };
      } catch (err) {
        if (err instanceof AuthError) redirectToAuth();
        throw err;
      }
    },
    [user],
  );

  return { checkAdmin, getStats, getActivity, getUsers, getWorkspaces, impersonate };
}
