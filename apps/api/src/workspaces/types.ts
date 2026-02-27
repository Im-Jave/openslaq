import type { AuthEnv } from "../auth/types";
import type { Workspace } from "@openslaq/shared";

export type WorkspaceEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & {
    workspace: Workspace;
  };
};
