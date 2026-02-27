export interface ParticipantTrackInfo {
  userId: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  cameraTrack: MediaStreamTrack | null;
  screenTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
}

export interface HuddleMediaState {
  connected: boolean;
  reconnecting: boolean;
  participants: ParticipantTrackInfo[];
  localParticipant: ParticipantTrackInfo | null;
  error: string | null;
}

export interface HuddleClientState {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}
