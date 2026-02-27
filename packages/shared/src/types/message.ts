import type { MessageId, ChannelId, UserId } from "./ids";
import type { Attachment } from "./attachment";
import type { ReactionGroup } from "./reaction";
import type { MessageActionButton } from "./bot";

export interface Mention {
  userId: UserId;
  displayName: string;
  type: "user" | "here" | "channel";
}

export interface HuddleMessageMetadata {
  huddleStartedAt: string;
  huddleEndedAt?: string;
  duration?: number;
  finalParticipants?: string[];
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  faviconUrl: string | null;
}

export interface SharedMessageInfo {
  id: MessageId;
  channelId: ChannelId;
  channelName: string;
  userId: UserId;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface Message {
  id: MessageId;
  channelId: ChannelId;
  userId: UserId;
  content: string;
  parentMessageId: MessageId | null;
  replyCount: number;
  latestReplyAt: string | null;
  attachments: Attachment[];
  reactions: ReactionGroup[];
  mentions: Mention[];
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  isBot?: boolean;
  botAppId?: string;
  actions?: MessageActionButton[];
  type?: "huddle" | null;
  metadata?: HuddleMessageMetadata | null;
  isPinned?: boolean;
  pinnedBy?: UserId | null;
  pinnedAt?: string | null;
  linkPreviews?: LinkPreview[];
  sharedMessage?: SharedMessageInfo | null;
  createdAt: string;
  updatedAt: string;
}
