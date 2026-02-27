import { pgTable, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { channels } from "./schema";
import { users } from "../users/schema";

export const starredChannels = pgTable(
  "starred_channels",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    starredAt: timestamp("starred_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channelId] })],
);
