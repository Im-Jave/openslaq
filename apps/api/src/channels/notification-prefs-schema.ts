import { pgTable, text, timestamp, uuid, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { channels } from "./schema";
import { users } from "../users/schema";

export const channelNotifyLevelEnum = pgEnum("channel_notify_level", ["all", "mentions", "muted"]);

export const channelNotificationPrefs = pgTable(
  "channel_notification_prefs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    level: channelNotifyLevelEnum("level").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channelId] })],
);
