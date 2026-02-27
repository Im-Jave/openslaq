import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { channelNotificationPrefs } from "./notification-prefs-schema";
import { channels } from "./schema";
import type { ChannelId, UserId, WorkspaceId } from "@openslaq/shared";
import type { ChannelNotifyLevel } from "@openslaq/shared";

export async function getChannelNotificationPrefs(
  userId: UserId,
  workspaceId: WorkspaceId,
): Promise<Record<string, ChannelNotifyLevel>> {
  const rows = await db
    .select({ channelId: channelNotificationPrefs.channelId, level: channelNotificationPrefs.level })
    .from(channelNotificationPrefs)
    .innerJoin(channels, eq(channels.id, channelNotificationPrefs.channelId))
    .where(and(eq(channelNotificationPrefs.userId, userId), eq(channels.workspaceId, workspaceId)));

  const result: Record<string, ChannelNotifyLevel> = {};
  for (const row of rows) {
    result[row.channelId] = row.level;
  }
  return result;
}

export async function getChannelNotificationPref(
  userId: UserId,
  channelId: ChannelId,
): Promise<ChannelNotifyLevel> {
  const rows = await db
    .select({ level: channelNotificationPrefs.level })
    .from(channelNotificationPrefs)
    .where(
      and(
        eq(channelNotificationPrefs.userId, userId),
        eq(channelNotificationPrefs.channelId, channelId),
      ),
    );
  return rows[0]?.level ?? "all";
}

export async function setChannelNotificationPref(
  userId: UserId,
  channelId: ChannelId,
  level: ChannelNotifyLevel,
): Promise<void> {
  if (level === "all") {
    // Default level — delete the row
    await db
      .delete(channelNotificationPrefs)
      .where(
        and(
          eq(channelNotificationPrefs.userId, userId),
          eq(channelNotificationPrefs.channelId, channelId),
        ),
      );
  } else {
    await db
      .insert(channelNotificationPrefs)
      .values({ userId, channelId, level, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [channelNotificationPrefs.userId, channelNotificationPrefs.channelId],
        set: { level, updatedAt: new Date() },
      });
  }
}
