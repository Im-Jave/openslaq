import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";

// In-memory tracking: userId → Set of socket IDs
const connectedSockets = new Map<string, Set<string>>();

export function addSocket(userId: string, socketId: string): boolean {
  const existing = connectedSockets.get(userId);
  if (existing) {
    existing.add(socketId);
    return false; // already online
  }
  connectedSockets.set(userId, new Set([socketId]));
  return true; // transitioned offline → online
}

export function removeSocket(userId: string, socketId: string): boolean {
  const existing = connectedSockets.get(userId);
  if (!existing) return false;
  existing.delete(socketId);
  if (existing.size === 0) {
    connectedSockets.delete(userId);
    return true; // transitioned online → offline
  }
  return false; // still has other sockets
}

export function getOnlineUserIds(): Set<string> {
  return new Set(connectedSockets.keys());
}

export function getSocketIdsForUser(userId: string): Set<string> {
  return connectedSockets.get(userId) ?? new Set();
}

export async function persistLastSeen(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  return rows.map((r) => r.workspaceId);
}

export async function getWorkspacePresence(
  workspaceId: string,
): Promise<Array<{ userId: string; online: boolean; lastSeenAt: string | null }>> {
  const members = await db
    .select({
      userId: workspaceMembers.userId,
      lastSeenAt: users.lastSeenAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const onlineIds = getOnlineUserIds();
  return members.map((m) => ({
    userId: m.userId,
    online: onlineIds.has(m.userId),
    lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
  }));
}
