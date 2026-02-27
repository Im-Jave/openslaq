import { pgTable, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { channels } from "./schema";
import { users } from "../users/schema";

export const channelReadPositions = pgTable(
  "channel_read_positions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channelId] })],
);
