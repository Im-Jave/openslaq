import { useCallback } from "react";
import {
  listWorkspaces as coreListWorkspaces,
  createWorkspace as coreCreateWorkspace,
  type WorkspaceListItem,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export type WorkspaceInfo = WorkspaceListItem;

export function useWorkspacesApi() {
  const auth = useAuthProvider();

  const listWorkspaces = useCallback(() => coreListWorkspaces({ api, auth }), [auth]);

  const createWorkspace = useCallback(
    (name: string) => coreCreateWorkspace({ api, auth }, name),
    [auth],
  );

  return { listWorkspaces, createWorkspace };
}
