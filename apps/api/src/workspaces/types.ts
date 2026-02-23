import type { AuthEnv } from "../auth/types";
import type { Workspace } from "@openslack/shared";

export type WorkspaceEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & {
    workspace: Workspace;
  };
};
