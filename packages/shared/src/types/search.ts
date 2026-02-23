import type { MessageId, ChannelId, UserId } from "./ids";
import type { ChannelType } from "./constants";

export interface SearchResultItem {
  messageId: MessageId;
  channelId: ChannelId;
  channelName: string;
  channelType: ChannelType;
  userId: UserId;
  userDisplayName: string;
  content: string;
  headline: string;
  parentMessageId: MessageId | null;
  createdAt: string;
  rank: number;
}

export interface SearchResult {
  results: SearchResultItem[];
  total: number;
}
