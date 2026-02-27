export interface HuddleParticipant {
  userId: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  joinedAt: string;
}

export interface HuddleState {
  channelId: string;
  participants: HuddleParticipant[];
  startedAt: string;
  livekitRoom: string;
  screenShareUserId: string | null;
}
