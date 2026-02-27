import { sql } from "drizzle-orm";
import { db } from "../db";
import type { SearchResult, SearchResultItem, WorkspaceId, UserId } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId, CHANNEL_TYPES } from "@openslaq/shared";
import type { SearchQuery } from "./validation";

/** Escape HTML in ts_headline output, preserving only <mark>/<​/mark> tags. */
function sanitizeHeadline(raw: string): string {
  const MARK_OPEN = "\x01MARK_OPEN\x01";
  const MARK_CLOSE = "\x01MARK_CLOSE\x01";
  const markOpenRe = new RegExp(MARK_OPEN, "g");
  const markCloseRe = new RegExp(MARK_CLOSE, "g");
  // Replace <mark> and </mark> with placeholders
  let s = raw.replace(/<mark>/g, MARK_OPEN).replace(/<\/mark>/g, MARK_CLOSE);
  // Escape HTML entities
  s = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // Restore <mark> tags
  s = s.replace(markOpenRe, "<mark>").replace(markCloseRe, "</mark>");
  return s;
}

function parseChannelType(value: string): SearchResultItem["channelType"] {
  if (value === CHANNEL_TYPES.PUBLIC || value === CHANNEL_TYPES.PRIVATE || value === CHANNEL_TYPES.DM) {
    return value;
  }
  throw new Error(`Unexpected channel type: ${value}`);
}

export async function searchMessages(
  workspaceId: WorkspaceId,
  currentUserId: UserId,
  params: SearchQuery,
): Promise<SearchResult> {
  const { q, channelId, userId, fromDate, toDate, offset, limit } = params;

  const conditions: ReturnType<typeof sql>[] = [
    sql`c.workspace_id = ${workspaceId}`,
    sql`cm.user_id = ${currentUserId}`,
    sql`m.search_vector @@ websearch_to_tsquery('english', ${q})`,
  ];

  if (channelId) {
    conditions.push(sql`m.channel_id = ${channelId}`);
  }
  if (userId) {
    conditions.push(sql`m.user_id = ${userId}`);
  }
  if (fromDate) {
    conditions.push(sql`m.created_at >= ${fromDate}::timestamptz`);
  }
  if (toDate) {
    conditions.push(sql`m.created_at <= ${toDate}::timestamptz`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const countQuery = sql`
    SELECT count(*)::int AS total
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    JOIN channel_members cm ON cm.channel_id = c.id
    WHERE ${whereClause}
  `;

  const resultsQuery = sql`
    SELECT
      m.id AS message_id,
      m.channel_id,
      c.name AS channel_name,
      c.type AS channel_type,
      m.user_id,
      u.display_name AS user_display_name,
      m.content,
      ts_headline('english', m.content, websearch_to_tsquery('english', ${q}),
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30, MinWords=10'
      ) AS headline,
      m.parent_message_id,
      m.created_at,
      ts_rank(m.search_vector, websearch_to_tsquery('english', ${q})) AS rank
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    JOIN channel_members cm ON cm.channel_id = c.id
    JOIN users u ON u.id = m.user_id
    WHERE ${whereClause}
    ORDER BY rank DESC, m.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const [countRows, resultRows] = await Promise.all([
    db.execute(countQuery),
    db.execute(resultsQuery),
  ]);

  const total = (countRows[0] as { total: number }).total;

  const results: SearchResultItem[] = resultRows.map((row) => {
    const r = row as {
      message_id: string;
      channel_id: string;
      channel_name: string;
      channel_type: string;
      user_id: string;
      user_display_name: string;
      content: string;
      headline: string;
      parent_message_id: string | null;
      created_at: Date;
      rank: number;
    };
    return {
      messageId: asMessageId(r.message_id),
      channelId: asChannelId(r.channel_id),
      channelName: r.channel_name,
      channelType: parseChannelType(r.channel_type),
      userId: asUserId(r.user_id),
      userDisplayName: r.user_display_name,
      content: r.content,
      headline: sanitizeHeadline(r.headline),
      parentMessageId: r.parent_message_id ? asMessageId(r.parent_message_id) : null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      rank: r.rank,
    };
  });

  return { results, total };
}
