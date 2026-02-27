import type { MessageId, ChannelId, UserId } from "./ids";
import type { Channel } from "./channel";
import type { Message } from "./message";
import type { ReactionGroup } from "./reaction";
import type { HuddleState } from "./huddle";

export interface SocketData {
  userId: UserId;
}

// Client → Server events
export interface ClientToServerEvents {
  "channel:join": (payload: { channelId: ChannelId }) => void;
  "channel:leave": (payload: { channelId: ChannelId }) => void;
  "message:typing": (payload: { channelId: ChannelId }) => void;
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
      statusEmoji?: string | null;
      statusText?: string | null;
      statusExpiresAt?: string | null;
    }>;
  }) => void;
  "user:statusUpdated": (payload: {
    userId: string;
    statusEmoji: string | null;
    statusText: string | null;
    statusExpiresAt: string | null;
  }) => void;
  "huddle:started": (huddle: HuddleState) => void;
  "huddle:updated": (huddle: HuddleState) => void;
  "huddle:ended": (payload: { channelId: ChannelId }) => void;
  "huddle:sync": (payload: { huddles: HuddleState[] }) => void;
  "channel:updated": (payload: { channelId: ChannelId; channel: Channel }) => void;
  "channel:member-added": (payload: { channelId: ChannelId; userId: UserId }) => void;
  "channel:member-removed": (payload: { channelId: ChannelId; userId: UserId }) => void;
  "message:pinned": (payload: { messageId: MessageId; channelId: ChannelId; pinnedBy: UserId; pinnedAt: string }) => void;
  "message:unpinned": (payload: { messageId: MessageId; channelId: ChannelId }) => void;
}
