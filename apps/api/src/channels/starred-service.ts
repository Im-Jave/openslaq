import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { starredChannels } from "./starred-schema";
import { channels } from "./schema";
import type { ChannelId, UserId, WorkspaceId } from "@openslaq/shared";
import { asChannelId } from "@openslaq/shared";

export async function getStarredChannelIds(userId: UserId, workspaceId: WorkspaceId): Promise<ChannelId[]> {
  const rows = await db
    .select({ channelId: starredChannels.channelId })
    .from(starredChannels)
    .innerJoin(channels, eq(channels.id, starredChannels.channelId))
    .where(and(eq(starredChannels.userId, userId), eq(channels.workspaceId, workspaceId)));
  return rows.map((r) => asChannelId(r.channelId));
}

export async function starChannel(userId: UserId, channelId: ChannelId): Promise<void> {
  await db
    .insert(starredChannels)
    .values({ userId, channelId })
    .onConflictDoNothing();
}

export async function unstarChannel(userId: UserId, channelId: ChannelId): Promise<void> {
  await db
    .delete(starredChannels)
    .where(
      and(
        eq(starredChannels.userId, userId),
        eq(starredChannels.channelId, channelId),
      ),
    );
}
