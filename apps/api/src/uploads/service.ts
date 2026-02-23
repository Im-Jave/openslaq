import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { attachments } from "./schema";
import { channels } from "../channels/schema";
import { messages } from "../messages/schema";
import { workspaceMembers } from "../workspaces/schema";
import { uploadToS3, getPresignedDownloadUrl, deleteFromS3 } from "./s3";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export async function createAttachment(
  file: { name: string; type: string; bytes: Uint8Array },
  userId: string,
) {
  const key = `uploads/${userId}/${crypto.randomUUID()}/${file.name}`;
  await uploadToS3(key, file.bytes, file.type);

  const [attachment] = await db
    .insert(attachments)
    .values({
      storageKey: key,
      filename: file.name,
      mimeType: file.type,
      size: file.bytes.length,
      uploadedBy: userId,
    })
    .returning();

  if (!attachment) throw new Error("Failed to insert attachment");
  return attachment;
}

export async function getAttachmentById(id: string) {
  return db.query.attachments.findFirst({
    where: eq(attachments.id, id),
  });
}

export function getDownloadUrl(storageKey: string): string {
  return getPresignedDownloadUrl(storageKey);
}

export async function linkAttachmentsToMessage(
  attachmentIds: string[],
  messageId: string,
  userId: string,
  tx: Tx = db,
): Promise<number> {
  if (attachmentIds.length === 0) return 0;

  const rows = await tx
    .update(attachments)
    .set({ messageId })
    .where(
      and(
        inArray(attachments.id, attachmentIds),
        eq(attachments.uploadedBy, userId),
        isNull(attachments.messageId),
      ),
    )
    .returning({ id: attachments.id });

  return rows.length;
}

export async function getAttachmentsForMessages(messageIds: string[], tx: Tx = db) {
  if (messageIds.length === 0) return [];

  return tx.query.attachments.findMany({
    where: inArray(attachments.messageId, messageIds),
  });
}

export async function deleteAttachmentsForMessage(messageId: string, tx: Tx = db) {
  const rows = await tx.query.attachments.findMany({
    where: eq(attachments.messageId, messageId),
  });

  await Promise.all(rows.map((row) => deleteFromS3(row.storageKey)));
}

export async function canAccessAttachment(
  attachment: { messageId: string | null; uploadedBy: string },
  userId: string,
): Promise<boolean> {
  if (!attachment.messageId) {
    return attachment.uploadedBy === userId;
  }

  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(messages)
    .innerJoin(channels, eq(channels.id, messages.channelId))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, channels.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(eq(messages.id, attachment.messageId))
    .limit(1);

  return !!row;
}

