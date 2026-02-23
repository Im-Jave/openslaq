import type { ChannelId, UserId } from "./ids";

export interface HuddleParticipant {
  userId: UserId;
  isMuted: boolean;
  joinedAt: string;
}

export interface HuddleState {
  channelId: ChannelId;
  participants: HuddleParticipant[];
  startedAt: string;
}

export interface WebRTCOffer {
  fromUserId: UserId;
  toUserId: UserId;
  channelId: ChannelId;
  sdp: string;
}

export interface WebRTCAnswer {
  fromUserId: UserId;
  toUserId: UserId;
  channelId: ChannelId;
  sdp: string;
}

export interface WebRTCIceCandidate {
  fromUserId: UserId;
  toUserId: UserId;
  channelId: ChannelId;
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}
