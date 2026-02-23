import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { channels, channelMembers } from "../channels/schema";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import type { Channel, WorkspaceId, UserId } from "@openslack/shared";
import { asChannelId, asWorkspaceId, asUserId, CHANNEL_TYPES } from "@openslack/shared";

function toChannel(row: typeof channels.$inferSelect): Channel {
  return {
    id: asChannelId(row.id),
    workspaceId: asWorkspaceId(row.workspaceId),
    name: row.name,
    type: row.type as Channel["type"],
    description: row.description,
    createdBy: row.createdBy ? asUserId(row.createdBy) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

interface DmUser {
  id: UserId;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface DmResult {
  channel: Channel;
  otherUser: DmUser | null;
  created: boolean;
}

export interface DmListItem {
  channel: Channel;
  otherUser: DmUser;
}

function dmChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

export async function getOrCreateDm(
  workspaceId: WorkspaceId,
  currentUserId: UserId,
  targetUserId: UserId,
): Promise<DmResult | null> {
  // Verify target user is a workspace member
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, targetUserId),
    ),
  });
  if (!membership) return null;

  const name = dmChannelName(currentUserId, targetUserId);

  // Check for existing DM channel
  const existing = await db.query.channels.findFirst({
    where: and(
      eq(channels.workspaceId, workspaceId),
      eq(channels.name, name),
      eq(channels.type, CHANNEL_TYPES.DM),
    ),
  });

  if (existing) {
    const otherUser = await getOtherUser(targetUserId);
    return { channel: toChannel(existing), otherUser, created: false };
  }

  // Create new DM channel
  const [channel] = await db
    .insert(channels)
    .values({
      workspaceId,
      name,
      type: CHANNEL_TYPES.DM,
      createdBy: currentUserId,
    })
    .returning();

  if (!channel) throw new Error("Failed to create DM channel");

  // Add both users as members
  const memberValues = [
    { channelId: channel.id, userId: currentUserId as string },
  ];
  if (targetUserId !== currentUserId) {
    memberValues.push({ channelId: channel.id, userId: targetUserId as string });
  }
  await db.insert(channelMembers).values(memberValues);

  const otherUser = await getOtherUser(targetUserId);
  return { channel: toChannel(channel), otherUser, created: true };
}

export async function listDms(workspaceId: WorkspaceId, userId: UserId): Promise<DmListItem[]> {
  // Find all DM channels the user is a member of in this workspace
  const rows = await db
    .select({
      channel: channels,
      memberId: channelMembers.userId,
    })
    .from(channels)
    .innerJoin(channelMembers, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, CHANNEL_TYPES.DM),
      ),
    );

  // Group by channel, find ones this user is in
  const channelMap = new Map<
    string,
    { channel: typeof rows[0]["channel"]; memberIds: string[] }
  >();
  for (const row of rows) {
    const entry = channelMap.get(row.channel.id);
    if (entry) {
      entry.memberIds.push(row.memberId);
    } else {
      channelMap.set(row.channel.id, {
        channel: row.channel,
        memberIds: [row.memberId],
      });
    }
  }

  const results: DmListItem[] = [];

  for (const { channel, memberIds } of channelMap.values()) {
    if (!memberIds.includes(userId)) continue;

    // The "other" user is the one that isn't the current user.
    // For self-DMs, otherUser is the current user.
    const otherUserId =
      memberIds.find((id) => id !== userId) ?? userId;

    const otherUser = await getOtherUser(otherUserId);
    if (otherUser) {
      results.push({ channel: toChannel(channel), otherUser });
    }
  }

  return results;
}

async function getOtherUser(userId: string): Promise<DmUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
    },
  });
  if (!user) return null;
  return {
    id: asUserId(user.id),
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}
