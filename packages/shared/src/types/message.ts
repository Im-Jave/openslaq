import type { MessageId, ChannelId, UserId } from "./ids";
import type { Attachment } from "./attachment";
import type { ReactionGroup } from "./reaction";

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
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
