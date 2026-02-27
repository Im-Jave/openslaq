import type { UserId } from "@openslaq/shared";

export interface AuthUser {
  id: UserId;
  email: string;
  displayName: string;
}

export type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};
