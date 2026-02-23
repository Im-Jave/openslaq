import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { channels } from "../channels/schema";
import { users } from "../users/schema";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    parentMessageId: uuid("parent_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_channel_toplevel_created_at")
      .on(table.channelId, sql`${table.createdAt} DESC`)
      .where(sql`${table.parentMessageId} IS NULL`),
    index("idx_messages_parent_created_at").on(
      table.parentMessageId,
      table.createdAt,
    ),
  ],
);
