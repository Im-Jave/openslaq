import { useCallback } from "react";
import {
  checkAdmin as coreCheckAdmin,
  getStats as coreGetStats,
  getActivity as coreGetActivity,
  getUsers as coreGetUsers,
  getAdminWorkspaces,
  impersonate as coreImpersonate,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useAdminApi() {
  const auth = useAuthProvider();

  const checkAdmin = useCallback(() => coreCheckAdmin({ api, auth }), [auth]);
  const getStats = useCallback(() => coreGetStats({ api, auth }), [auth]);
  const getActivity = useCallback((days = 30) => coreGetActivity({ api, auth }, days), [auth]);
  const getUsers = useCallback(
    (page = 1, pageSize = 20, search?: string) => coreGetUsers({ api, auth }, page, pageSize, search),
    [auth],
  );
  const getWorkspaces = useCallback(
    (page = 1, pageSize = 20, search?: string) => getAdminWorkspaces({ api, auth }, page, pageSize, search),
    [auth],
  );
  const impersonate = useCallback((userId: string) => coreImpersonate({ api, auth }, userId), [auth]);

  return { checkAdmin, getStats, getActivity, getUsers, getWorkspaces, impersonate };
}
