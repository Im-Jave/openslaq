import type { UserId } from "./ids";

export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: UserId[];
}
