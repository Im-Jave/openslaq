import type { UserId, WorkspaceId } from "./ids";
import type { Role } from "./constants";

export interface User {
  id: UserId;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: WorkspaceId;
  userId: UserId;
  role: Role;
  joinedAt: string;
}
