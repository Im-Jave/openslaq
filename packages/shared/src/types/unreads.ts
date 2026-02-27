import type { ChannelId } from "./ids";
import type { ChannelType } from "./constants";
import type { Message } from "./message";

export interface UnreadChannelGroup {
  channelId: ChannelId;
  channelName: string;
  channelType: ChannelType;
  messages: Message[];
}

export interface AllUnreadsResponse {
  channels: UnreadChannelGroup[];
  threadMentions: Message[];
}
