import { eq, and, gt, ne, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { channelMembers } from "./schema";
import { channelReadPositions } from "./read-positions-schema";
import { messages } from "../messages/schema";
import type { UserId, ChannelId } from "@openslack/shared";

export async function getUnreadCounts(userId: UserId): Promise<Record<string, number>> {
  const rows = await db
    .select({
      channelId: channelMembers.channelId,
      count: sql<number>`count(${messages.id})::int`,
    })
    .from(channelMembers)
    .leftJoin(
      channelReadPositions,
      and(
        eq(channelReadPositions.channelId, channelMembers.channelId),
        eq(channelReadPositions.userId, channelMembers.userId),
      ),
    )
    .innerJoin(
      messages,
      and(
        eq(messages.channelId, channelMembers.channelId),
        isNull(messages.parentMessageId),
        ne(messages.userId, userId),
        gt(messages.createdAt, sql`coalesce(${channelReadPositions.lastReadAt}, '1970-01-01')`),
      ),
    )
    .where(eq(channelMembers.userId, userId))
    .groupBy(channelMembers.channelId)
    .having(sql`count(${messages.id}) > 0`);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.channelId] = row.count;
  }
  return counts;
}

export async function markChannelAsRead(userId: UserId, channelId: ChannelId): Promise<void> {
  await db
    .insert(channelReadPositions)
    .values({ userId, channelId, lastReadAt: sql`now()` })
    .onConflictDoUpdate({
      target: [channelReadPositions.userId, channelReadPositions.channelId],
      set: { lastReadAt: sql`now()` },
    });
}
