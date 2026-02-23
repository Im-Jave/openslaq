import { pgTable, text, timestamp, uuid, primaryKey, unique, index } from "drizzle-orm/pg-core";
import { workspaces } from "../workspaces/schema";
import { users } from "../users/schema";

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull().default("public"), // "public" | "private" | "dm"
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.name, t.type)],
);

export const channelMembers = pgTable(
  "channel_members",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.userId] }),
    index("idx_channel_members_user_channel").on(t.userId, t.channelId),
  ],
);
