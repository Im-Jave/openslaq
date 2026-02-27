import { pgTable, text, timestamp, uuid, primaryKey, index, integer } from "drizzle-orm/pg-core";
import { messages } from "./schema";

export const linkPreviews = pgTable("link_previews", {
  url: text("url").primaryKey(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  siteName: text("site_name"),
  faviconUrl: text("favicon_url"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  fetchError: text("fetch_error"),
});

export const messageLinkPreviews = pgTable(
  "message_link_previews",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    url: text("url")
      .notNull()
      .references(() => linkPreviews.url, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.url] }),
    index("idx_message_link_previews_message_id").on(t.messageId),
  ],
);
