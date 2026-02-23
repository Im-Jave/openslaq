import { createMiddleware } from "hono/factory";
import { asChannelId, CHANNEL_TYPES, ROLES } from "@openslack/shared";
import type { Channel } from "@openslack/shared";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { getChannelById, isChannelMember } from "./service";
import { hasMinimumRole } from "../auth/permissions";

export type ChannelEnv = WorkspaceMemberEnv & {
  Variables: WorkspaceMemberEnv["Variables"] & {
    channel: Channel;
  };
};

export const resolveChannel = createMiddleware<ChannelEnv>(async (c, next) => {
  const channelId = asChannelId(c.req.param("id")!);
  const workspace = c.get("workspace");

  const channel = await getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspace.id) {
    return c.json({ error: "Channel not found" }, 404);
  }

  // For private channels, hide from non-members (return 404, not 403)
  if (channel.type === CHANNEL_TYPES.PRIVATE) {
    const user = c.get("user");
    const isMember = await isChannelMember(channel.id, user.id);
    if (!isMember) {
      return c.json({ error: "Channel not found" }, 404);
    }
  }

  c.set("channel", channel);
  await next();
});

export const requireChannelMember = createMiddleware<ChannelEnv>(async (c, next) => {
  const channel = c.get("channel");
  const user = c.get("user");

  const isMember = await isChannelMember(channel.id, user.id);
  if (!isMember) {
    return c.json({ error: "Not a channel member" }, 403);
  }

  await next();
});

/** Requires user to be channel creator or workspace admin/owner. Only enforced on private channels. */
export const requirePrivateChannelAdmin = createMiddleware<ChannelEnv>(async (c, next) => {
  const channel = c.get("channel");
  if (channel.type !== CHANNEL_TYPES.PRIVATE) {
    await next();
    return;
  }

  const user = c.get("user");
  const memberRole = c.get("memberRole");

  const isCreator = channel.createdBy === user.id;
  const isWorkspaceAdmin = hasMinimumRole(memberRole, ROLES.ADMIN);

  if (!isCreator && !isWorkspaceAdmin) {
    return c.json({ error: "Only channel creator or workspace admin can manage members" }, 403);
  }

  await next();
});
