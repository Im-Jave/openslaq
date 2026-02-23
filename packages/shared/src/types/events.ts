import type { MessageId, ChannelId, UserId } from "./ids";
import type { Message } from "./message";
import type { ReactionGroup } from "./reaction";
import type { HuddleState, WebRTCOffer, WebRTCAnswer, WebRTCIceCandidate } from "./huddle";

export interface SocketData {
  userId: UserId;
}

// Client → Server events
export interface ClientToServerEvents {
  "channel:join": (payload: { channelId: ChannelId }) => void;
  "channel:leave": (payload: { channelId: ChannelId }) => void;
  "message:typing": (payload: { channelId: ChannelId }) => void;
  "huddle:start": (payload: { channelId: ChannelId }) => void;
  "huddle:join": (payload: { channelId: ChannelId }) => void;
  "huddle:leave": () => void;
  "huddle:mute": (payload: { isMuted: boolean }) => void;
  "webrtc:offer": (payload: Omit<WebRTCOffer, "fromUserId">) => void;
  "webrtc:answer": (payload: Omit<WebRTCAnswer, "fromUserId">) => void;
  "webrtc:ice-candidate": (payload: Omit<WebRTCIceCandidate, "fromUserId">) => void;
}

// Server → Client events
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;
  "message:deleted": (payload: {
    id: MessageId;
    channelId: ChannelId;
  }) => void;
  "user:typing": (payload: {
    userId: UserId;
    channelId: ChannelId;
  }) => void;
  "thread:updated": (payload: {
    parentMessageId: MessageId;
    channelId: ChannelId;
    replyCount: number;
    latestReplyAt: string;
  }) => void;
  "reaction:updated": (payload: {
    messageId: MessageId;
    channelId: ChannelId;
    reactions: ReactionGroup[];
  }) => void;
  "presence:updated": (payload: {
    userId: string;
    status: "online" | "offline";
    lastSeenAt: string | null;
  }) => void;
  "presence:sync": (payload: {
    users: Array<{
      userId: string;
      status: "online" | "offline";
      lastSeenAt: string | null;
    }>;
  }) => void;
  "huddle:started": (huddle: HuddleState) => void;
  "huddle:updated": (huddle: HuddleState) => void;
  "huddle:ended": (payload: { channelId: ChannelId }) => void;
  "huddle:sync": (payload: { huddles: HuddleState[] }) => void;
  "webrtc:offer": (payload: WebRTCOffer) => void;
  "webrtc:answer": (payload: WebRTCAnswer) => void;
  "webrtc:ice-candidate": (payload: WebRTCIceCandidate) => void;
  "channel:member-added": (payload: { channelId: ChannelId; userId: UserId }) => void;
  "channel:member-removed": (payload: { channelId: ChannelId; userId: UserId }) => void;
}
