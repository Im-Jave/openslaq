import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { reactions } from "./schema";
import { messages } from "../messages/schema";
import type { ReactionGroup, MessageId, UserId, ChannelId } from "@openslack/shared";
import { asUserId } from "@openslack/shared";

export async function toggleReaction(
  messageId: MessageId,
  userId: UserId,
  emoji: string,
): Promise<{ reactions: ReactionGroup[]; channelId: ChannelId } | null> {
  // Verify message exists and get channelId
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
    columns: { channelId: true },
  });

  if (!message) return null;

  // Check if reaction already exists
  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.messageId, messageId),
      eq(reactions.userId, userId),
      eq(reactions.emoji, emoji),
    ),
  });

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
  } else {
    await db.insert(reactions).values({ messageId, userId, emoji });
  }

  const groups = await getReactionsForMessage(messageId);

  return {
    reactions: groups,
    channelId: message.channelId as ChannelId,
  };
}

async function getReactionsForMessage(messageId: string): Promise<ReactionGroup[]> {
  const rows = await db.query.reactions.findMany({
    where: eq(reactions.messageId, messageId),
  });

  const byEmoji = new Map<string, UserId[]>();
  for (const row of rows) {
    const list = byEmoji.get(row.emoji) ?? [];
    list.push(asUserId(row.userId));
    byEmoji.set(row.emoji, list);
  }

  return Array.from(byEmoji.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}

export async function getReactionsForMessages(
  messageIds: string[],
): Promise<Map<string, ReactionGroup[]>> {
  if (messageIds.length === 0) return new Map();

  const rows = await db.query.reactions.findMany({
    where: inArray(reactions.messageId, messageIds),
  });

  // Group by messageId, then by emoji
  const byMessage = new Map<string, Map<string, UserId[]>>();
  for (const row of rows) {
    let emojiMap = byMessage.get(row.messageId);
    if (!emojiMap) {
      emojiMap = new Map();
      byMessage.set(row.messageId, emojiMap);
    }
    const list = emojiMap.get(row.emoji) ?? [];
    list.push(asUserId(row.userId));
    emojiMap.set(row.emoji, list);
  }

  const result = new Map<string, ReactionGroup[]>();
  for (const [messageId, emojiMap] of byMessage) {
    result.set(
      messageId,
      Array.from(emojiMap.entries()).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        userIds,
      })),
    );
  }

  return result;
}
