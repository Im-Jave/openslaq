import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { workspaceInvites } from "./invite-schema";
import { workspaceMembers, workspaces } from "./schema";
import { channels, channelMembers } from "../channels/schema";
import { DEFAULT_CHANNELS } from "@openslack/shared";

export async function createInvite(
  workspaceId: string,
  createdBy: string,
  maxUses?: number,
  expiresInHours = 168,
) {
  const code = crypto.randomBytes(9).toString("base64url");
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const [invite] = await db
    .insert(workspaceInvites)
    .values({ workspaceId, code, createdBy, maxUses: maxUses ?? null, expiresAt })
    .returning();

  return invite!;
}

export async function getInviteByCode(code: string) {
  return db.query.workspaceInvites.findFirst({
    where: eq(workspaceInvites.code, code),
  });
}

export async function listInvites(workspaceId: string) {
  return db
    .select()
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        isNull(workspaceInvites.revokedAt),
        sql`(${workspaceInvites.expiresAt} IS NULL OR ${workspaceInvites.expiresAt} > NOW())`,
      ),
    );
}

export async function revokeInvite(inviteId: string, workspaceId: string) {
  const [updated] = await db
    .update(workspaceInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function acceptInvite(code: string, userId: string) {
  const invite = await getInviteByCode(code);
  if (!invite) return { error: "Invite not found" as const };

  return db.transaction(async (tx) => {
    // Check if user is already a workspace member — if yes, return success (no useCount bump)
    const existingMember = await tx.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, invite.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    });

    if (existingMember) {
      const workspace = await tx.query.workspaces.findFirst({
        where: eq(workspaces.id, invite.workspaceId),
      });
      return { workspace: workspace! };
    }

    // Atomically increment useCount only if invite is still valid
    const [updated] = await tx
      .update(workspaceInvites)
      .set({ useCount: sql`${workspaceInvites.useCount} + 1` })
      .where(
        and(
          eq(workspaceInvites.id, invite.id),
          isNull(workspaceInvites.revokedAt),
          sql`(${workspaceInvites.maxUses} IS NULL OR ${workspaceInvites.useCount} < ${workspaceInvites.maxUses})`,
          sql`(${workspaceInvites.expiresAt} IS NULL OR ${workspaceInvites.expiresAt} > NOW())`,
        ),
      )
      .returning();

    if (!updated) {
      // Determine the specific error
      if (invite.revokedAt) return { error: "Invite has been revoked" as const };
      if (invite.expiresAt && invite.expiresAt < new Date())
        return { error: "Invite has expired" as const };
      return { error: "Invite has reached maximum uses" as const };
    }

    // Insert workspace membership
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: invite.workspaceId, userId, role: "member" });

    // Auto-join #general channel if it exists
    const generalChannel = await tx.query.channels.findFirst({
      where: and(
        eq(channels.workspaceId, invite.workspaceId),
        eq(channels.name, DEFAULT_CHANNELS.GENERAL),
      ),
    });
    if (generalChannel) {
      await tx
        .insert(channelMembers)
        .values({ channelId: generalChannel.id, userId })
        .onConflictDoNothing();
    }

    const workspace = await tx.query.workspaces.findFirst({
      where: eq(workspaces.id, invite.workspaceId),
    });

    return { workspace: workspace! };
  });
}
