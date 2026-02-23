import { eq, and, desc, asc, isNull, inArray, sql, count, max } from "drizzle-orm";
import { db } from "../db";
import { messages } from "./schema";
import { users } from "../users/schema";
import {
  linkAttachmentsToMessage,
  getAttachmentsForMessages,
  deleteAttachmentsForMessage,
} from "../uploads/service";
import { getReactionsForMessages } from "../reactions/service";
import type {
  Message,
  Attachment,
  ReactionGroup,
  MessageId,
  ChannelId,
  UserId,
} from "@openslack/shared";
import {
  asMessageId,
  asChannelId,
  asUserId,
  asAttachmentId,
} from "@openslack/shared";

// --- DB type aliases ---

type DbAttachment = Awaited<ReturnType<typeof getAttachmentsForMessages>>[number];

// --- Serialization ---

function toAttachment(a: DbAttachment): Attachment {
  return {
    id: asAttachmentId(a.id),
    messageId: a.messageId ? asMessageId(a.messageId) : null,
    storageKey: a.storageKey,
    filename: a.filename,
    mimeType: a.mimeType,
    size: a.size,
    uploadedBy: asUserId(a.uploadedBy),
    createdAt: a.createdAt.toISOString(),
  };
}

function toMessage(
  m: typeof messages.$inferSelect,
  attachments: DbAttachment[],
  threadMeta?: { replyCount: number; latestReplyAt: Date | null },
  reactions: ReactionGroup[] = [],
  sender?: { displayName: string; avatarUrl: string | null },
): Message {
  return {
    id: asMessageId(m.id),
    channelId: asChannelId(m.channelId),
    userId: asUserId(m.userId),
    content: m.content,
    parentMessageId: m.parentMessageId ? asMessageId(m.parentMessageId) : null,
    replyCount: threadMeta?.replyCount ?? 0,
    latestReplyAt: threadMeta?.latestReplyAt?.toISOString() ?? null,
    attachments: attachments.map(toAttachment),
    reactions,
    senderDisplayName: sender?.displayName,
    senderAvatarUrl: sender?.avatarUrl ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

// --- Data fetching helpers ---

async function batchAttachments(messageIds: string[]) {
  const allAttachments = await getAttachmentsForMessages(messageIds);
  const byMessage = new Map<string, typeof allAttachments>();
  for (const att of allAttachments) {
    if (!att.messageId) continue;
    const list = byMessage.get(att.messageId) ?? [];
    list.push(att);
    byMessage.set(att.messageId, list);
  }
  return byMessage;
}

async function batchThreadMeta(messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, { replyCount: number; latestReplyAt: Date | null }>();

  const rows = await db
    .select({
      parentMessageId: messages.parentMessageId,
      replyCount: count(),
      latestReplyAt: max(messages.createdAt),
    })
    .from(messages)
    .where(inArray(messages.parentMessageId, messageIds))
    .groupBy(messages.parentMessageId);

  const map = new Map<string, { replyCount: number; latestReplyAt: Date | null }>();
  for (const row of rows) {
    if (row.parentMessageId) {
      map.set(row.parentMessageId, {
        replyCount: row.replyCount,
        latestReplyAt: row.latestReplyAt,
      });
    }
  }
  return map;
}

async function batchReactions(messageIds: string[]) {
  return getReactionsForMessages(messageIds);
}

type SenderInfo = { displayName: string; avatarUrl: string | null };

async function batchSenders(
  messageRows: { userId: string }[],
): Promise<Map<string, SenderInfo>> {
  const uniqueUserIds = [...new Set(messageRows.map((m) => m.userId))];
  if (uniqueUserIds.length === 0) return new Map();

  const rows = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, uniqueUserIds));

  const map = new Map<string, SenderInfo>();
  for (const row of rows) {
    map.set(row.id, { displayName: row.displayName, avatarUrl: row.avatarUrl });
  }
  return map;
}

// --- Public API ---

export async function getMessages(
  channelId: ChannelId,
  cursor?: string,
  limit = 50,
  direction: "older" | "newer" = "older",
): Promise<{ messages: Message[]; nextCursor: MessageId | null }> {
  const conditions = [eq(messages.channelId, channelId), isNull(messages.parentMessageId)];
  if (cursor) {
    // Compare directly in SQL to preserve microsecond precision
    // (JavaScript Date truncates to milliseconds, causing gt()/lt() to include the cursor row)
    conditions.push(
      direction === "newer"
        ? sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${cursor})`
        : sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${cursor})`,
    );
  }

  const result = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: direction === "newer" ? asc(messages.createdAt) : desc(messages.createdAt),
    limit: limit + 1,
  });

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  const messageIds = items.map((m) => m.id);
  const [attachmentsByMessage, threadMeta, reactionsByMessage, sendersByUser] = await Promise.all([
    batchAttachments(messageIds),
    batchThreadMeta(messageIds),
    batchReactions(messageIds),
    batchSenders(items),
  ]);

  const serialized = items.map((m) =>
    toMessage(m, attachmentsByMessage.get(m.id) ?? [], threadMeta.get(m.id), reactionsByMessage.get(m.id) ?? [], sendersByUser.get(m.userId)),
  );

  return {
    messages: serialized,
    nextCursor: hasMore ? asMessageId(items[items.length - 1]!.id) : null,
  };
}

export async function getMessageById(messageId: MessageId): Promise<Message | null> {
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!message) return null;

  const [attachmentsByMessage, threadMeta, reactionsByMessage, sendersByUser] = await Promise.all([
    batchAttachments([message.id]),
    batchThreadMeta([message.id]),
    batchReactions([message.id]),
    batchSenders([message]),
  ]);

  return toMessage(
    message,
    attachmentsByMessage.get(message.id) ?? [],
    threadMeta.get(message.id),
    reactionsByMessage.get(message.id) ?? [],
    sendersByUser.get(message.userId),
  );
}

export async function getThreadReplies(
  parentMessageId: MessageId,
  cursor?: string,
  limit = 50,
): Promise<{ messages: Message[]; nextCursor: MessageId | null }> {
  const conditions = [eq(messages.parentMessageId, parentMessageId)];
  if (cursor) {
    // Compare directly in SQL to preserve microsecond precision
    // (JavaScript Date truncates to milliseconds, causing gt() to include the cursor row)
    conditions.push(sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${cursor})`);
  }

  const result = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: asc(messages.createdAt),
    limit: limit + 1,
  });

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  const messageIds = items.map((m) => m.id);
  const [attachmentsByMessage, reactionsByMessage, sendersByUser] = await Promise.all([
    batchAttachments(messageIds),
    batchReactions(messageIds),
    batchSenders(items),
  ]);

  // Replies don't need thread meta (no nested threads)
  const serialized = items.map((m) =>
    toMessage(m, attachmentsByMessage.get(m.id) ?? [], undefined, reactionsByMessage.get(m.id) ?? [], sendersByUser.get(m.userId)),
  );

  return {
    messages: serialized,
    nextCursor: hasMore ? asMessageId(items[items.length - 1]!.id) : null,
  };
}

export async function getMessagesAround(
  channelId: ChannelId,
  targetMessageId: MessageId,
  limit = 25,
): Promise<{
  messages: Message[];
  targetFound: boolean;
  olderCursor: MessageId | null;
  newerCursor: MessageId | null;
  hasOlder: boolean;
  hasNewer: boolean;
}> {
  // Find the target message's createdAt
  const target = await db.query.messages.findFirst({
    where: and(eq(messages.id, targetMessageId), eq(messages.channelId, channelId)),
  });

  if (!target) {
    return { messages: [], targetFound: false, olderCursor: null, newerCursor: null, hasOlder: false, hasNewer: false };
  }

  // Fetch messages before and after (including the target), top-level only
  // Fetch limit+1 to detect if there are more in each direction
  const beforeRows = await db.query.messages.findMany({
    where: and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId),
      sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${targetMessageId})`,
    ),
    orderBy: desc(messages.createdAt),
    limit: limit + 1,
  });

  const afterRows = await db.query.messages.findMany({
    where: and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId),
      sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${targetMessageId})`,
    ),
    orderBy: asc(messages.createdAt),
    limit: limit + 1,
  });

  const hasOlder = beforeRows.length > limit;
  const hasNewer = afterRows.length > limit;
  const trimmedBefore = hasOlder ? beforeRows.slice(0, limit) : beforeRows;
  const trimmedAfter = hasNewer ? afterRows.slice(0, limit) : afterRows;

  // If the target is a reply, include the parent message context;
  // if it's top-level, include it directly
  const targetRow = target.parentMessageId
    ? await db.query.messages.findFirst({ where: eq(messages.id, target.parentMessageId) })
    : target;

  const allRows = [...trimmedBefore.reverse(), ...(targetRow ? [targetRow] : []), ...trimmedAfter];
  // Deduplicate (target may overlap with before/after)
  const seen = new Set<string>();
  const uniqueRows = allRows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const messageIds = uniqueRows.map((m) => m.id);
  const [attachmentsByMessage, threadMeta, reactionsByMessage, sendersByUser] = await Promise.all([
    batchAttachments(messageIds),
    batchThreadMeta(messageIds),
    batchReactions(messageIds),
    batchSenders(uniqueRows),
  ]);

  const serialized = uniqueRows.map((m) =>
    toMessage(m, attachmentsByMessage.get(m.id) ?? [], threadMeta.get(m.id), reactionsByMessage.get(m.id) ?? [], sendersByUser.get(m.userId)),
  );

  const olderCursor = uniqueRows.length > 0 ? asMessageId(uniqueRows[0]!.id) : null;
  const newerCursor = uniqueRows.length > 0 ? asMessageId(uniqueRows[uniqueRows.length - 1]!.id) : null;

  return { messages: serialized, targetFound: true, olderCursor, newerCursor, hasOlder, hasNewer };
}

export class AttachmentLinkError extends Error {
  constructor() {
    super("One or more attachments are invalid or already linked");
  }
}

export async function createMessage(
  channelId: ChannelId,
  userId: UserId,
  content: string,
  attachmentIds: string[] = [],
): Promise<Message> {
  return db.transaction(async (tx) => {
    const [message] = await tx
      .insert(messages)
      .values({ channelId, userId, content })
      .returning();

    if (!message) throw new Error("Failed to insert message");

    if (attachmentIds.length > 0) {
      const linked = await linkAttachmentsToMessage(attachmentIds, message.id, userId, tx);
      if (linked !== attachmentIds.length) {
        throw new AttachmentLinkError();
      }
    }

    const [messageAttachments, sendersByUser] = await Promise.all([
      getAttachmentsForMessages([message.id], tx),
      batchSenders([message]),
    ]);
    return toMessage(message, messageAttachments, undefined, [], sendersByUser.get(message.userId));
  });
}

export type ThreadReplyResult =
  | {
      reply: Message;
      threadUpdate: {
        parentMessageId: MessageId;
        channelId: ChannelId;
        replyCount: number;
        latestReplyAt: string;
      };
    }
  | { error: "Parent message not found" | "Cannot reply to a reply" | "Parent message not in this channel" };

export async function createThreadReply(
  parentMessageId: MessageId,
  channelId: ChannelId,
  userId: UserId,
  content: string,
  attachmentIds: string[] = [],
): Promise<ThreadReplyResult> {
  // Verify parent exists and is a top-level message
  const parent = await db.query.messages.findFirst({
    where: eq(messages.id, parentMessageId),
  });

  if (!parent) return { error: "Parent message not found" };
  if (parent.parentMessageId) return { error: "Cannot reply to a reply" };
  if (parent.channelId !== channelId) return { error: "Parent message not in this channel" };

  return db.transaction(async (tx) => {
    const [reply] = await tx
      .insert(messages)
      .values({ channelId, userId, content, parentMessageId })
      .returning();

    if (!reply) throw new Error("Failed to insert reply");

    if (attachmentIds.length > 0) {
      const linked = await linkAttachmentsToMessage(attachmentIds, reply.id, userId, tx);
      if (linked !== attachmentIds.length) {
        throw new AttachmentLinkError();
      }
    }

    const [replyAttachments, sendersByUser] = await Promise.all([
      getAttachmentsForMessages([reply.id], tx),
      batchSenders([reply]),
    ]);

    // Get updated thread meta for the parent (outside tx is fine, but using tx for consistency)
    const threadMeta = await batchThreadMeta([parentMessageId]);
    const meta = threadMeta.get(parentMessageId);

    return {
      reply: toMessage(reply, replyAttachments, undefined, [], sendersByUser.get(reply.userId)),
      threadUpdate: {
        parentMessageId: asMessageId(parentMessageId),
        channelId: asChannelId(channelId),
        replyCount: meta?.replyCount ?? 1,
        latestReplyAt: meta?.latestReplyAt?.toISOString() ?? reply.createdAt.toISOString(),
      },
    };
  });
}

export async function editMessage(
  messageId: MessageId,
  userId: UserId,
  content: string,
): Promise<Message | null> {
  const [updated] = await db
    .update(messages)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .returning();

  if (!updated) return null;

  const [attachmentsByMessage, threadMeta, reactionsByMessage, sendersByUser] = await Promise.all([
    batchAttachments([updated.id]),
    batchThreadMeta([updated.id]),
    batchReactions([updated.id]),
    batchSenders([updated]),
  ]);

  return toMessage(
    updated,
    attachmentsByMessage.get(updated.id) ?? [],
    threadMeta.get(updated.id),
    reactionsByMessage.get(updated.id) ?? [],
    sendersByUser.get(updated.userId),
  );
}

export async function deleteMessage(messageId: MessageId, userId: UserId): Promise<{ id: MessageId; channelId: ChannelId } | null> {
  // Verify ownership before doing anything
  const message = await db.query.messages.findFirst({
    where: and(eq(messages.id, messageId), eq(messages.userId, userId)),
  });

  if (!message) return null;

  // Delete S3 objects before deleting the message (DB rows cascade-delete)
  await deleteAttachmentsForMessage(messageId);

  await db.delete(messages).where(eq(messages.id, messageId));

  return { id: asMessageId(message.id), channelId: asChannelId(message.channelId) };
}
