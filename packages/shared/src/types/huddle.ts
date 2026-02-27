import type { ChannelId, UserId } from "./ids";

export interface HuddleParticipant {
  userId: UserId;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface HuddleState {
  channelId: ChannelId;
  participants: HuddleParticipant[];
  startedAt: string;
  livekitRoom: string | null;
  screenShareUserId: UserId | null;
  messageId: string | null;
}
