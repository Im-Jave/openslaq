import type { ChannelId, WorkspaceId, UserId } from "./ids";
import type { ChannelType } from "./constants";

export interface Channel {
  id: ChannelId;
  workspaceId: WorkspaceId;
  name: string;
  type: ChannelType;
  description: string | null;
  createdBy: UserId | null;
  createdAt: string;
  memberCount?: number;
}

export interface ChannelMember {
  channelId: ChannelId;
  userId: UserId;
  joinedAt: string;
}
