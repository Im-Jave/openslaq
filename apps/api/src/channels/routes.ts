import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createChannelSchema, addChannelMemberSchema } from "./validation";
import { listChannels, createChannel, joinChannel, leaveChannel, listChannelMembers, addChannelMember, removeChannelMember } from "./service";
import { markChannelAsRead } from "./read-positions-service";
import { resolveChannel, requireChannelMember, requirePrivateChannelAdmin } from "./middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlChannelCreate, rlChannelJoinLeave, rlMarkAsRead, rlRead, rlMemberManage } from "../rate-limit";
import { hasMinimumRole } from "../auth/permissions";
import { ROLES, CHANNEL_TYPES, asUserId } from "@openslack/shared";
import { getIO } from "../socket/io";
import { getSocketIdsForUser } from "../presence/service";
import { channelSchema, channelMemberSchema, okSchema, errorSchema } from "../openapi/schemas";

const channelIdParam = z.object({ id: z.string().describe("Channel ID") });

const listChannelsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Channels"],
  summary: "List channels",
  description: "Returns all channels the user is a member of in this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(channelSchema) } },
      description: "List of channels",
    },
  },
});

const createChannelRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Channels"],
  summary: "Create channel",
  description: "Creates a new channel. Only admins can create private channels.",
  security: [{ Bearer: [] }],
  middleware: [rlChannelCreate] as const,
  request: {
    body: { content: { "application/json": { schema: createChannelSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: channelSchema } },
      description: "Created channel",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Only admins can create private channels",
    },
  },
});

const joinChannelRoute = createRoute({
  method: "post",
  path: "/:id/join",
  tags: ["Channels"],
  summary: "Join channel",
  description: "Joins a public channel.",
  security: [{ Bearer: [] }],
  middleware: [rlChannelJoinLeave, resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Joined" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Cannot self-join a private channel" },
  },
});

const leaveChannelRoute = createRoute({
  method: "post",
  path: "/:id/leave",
  tags: ["Channels"],
  summary: "Leave channel",
  description: "Leaves a channel the user is a member of.",
  security: [{ Bearer: [] }],
  middleware: [rlChannelJoinLeave, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Left" },
  },
});

const listChannelMembersRoute = createRoute({
  method: "get",
  path: "/:id/members",
  tags: ["Channels"],
  summary: "List channel members",
  description: "Returns all members of a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(channelMemberSchema) } },
      description: "Channel members",
    },
  },
});

const addChannelMemberRoute = createRoute({
  method: "post",
  path: "/:id/members",
  tags: ["Channels"],
  summary: "Add channel member",
  description: "Adds a user to a private channel. Requires channel creator or workspace admin role.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember, requirePrivateChannelAdmin] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: addChannelMemberSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: okSchema } }, description: "Member added" },
  },
});

const removeChannelMemberRoute = createRoute({
  method: "delete",
  path: "/:id/members/:userId",
  tags: ["Channels"],
  summary: "Remove channel member",
  description: "Removes a user from a private channel. Cannot remove the channel creator.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember, requirePrivateChannelAdmin] as const,
  request: {
    params: z.object({
      id: z.string().describe("Channel ID"),
      userId: z.string().describe("User ID to remove"),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Member removed" },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Cannot remove the channel creator" },
  },
});

const markReadRoute = createRoute({
  method: "post",
  path: "/:id/read",
  tags: ["Channels"],
  summary: "Mark channel as read",
  description: "Marks all messages in the channel as read for the authenticated user.",
  security: [{ Bearer: [] }],
  middleware: [rlMarkAsRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Marked as read" },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listChannelsRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const result = await listChannels(workspace.id, user.id);
    return c.json(result as any, 200);
  })
  .openapi(createChannelRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const { name, description, type } = c.req.valid("json");

    if (type === "private") {
      const memberRole = c.get("memberRole");
      if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
        return c.json({ error: "Only admins can create private channels" }, 403);
      }
    }

    const channel = await createChannel(workspace.id, name, description, user.id, type);
    return c.json(channel as any, 201);
  })
  .openapi(joinChannelRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");

    if (channel.type === CHANNEL_TYPES.PRIVATE) {
      return c.json({ error: "Cannot self-join a private channel" }, 403);
    }

    await joinChannel(channel.id, user.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(leaveChannelRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    await leaveChannel(channel.id, user.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(listChannelMembersRoute, async (c) => {
    const channel = c.get("channel");
    const members = await listChannelMembers(channel.id);
    return c.json(members as any, 200);
  })
  .openapi(addChannelMemberRoute, async (c) => {
    const channel = c.get("channel");
    const targetUserId = asUserId(c.req.valid("json").userId);
    await addChannelMember(channel.id, targetUserId);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:member-added", {
      channelId: channel.id,
      userId: targetUserId,
    });

    // Join the target user's sockets to the channel room
    const socketIds = getSocketIdsForUser(targetUserId);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.join(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 201);
  })
  .openapi(removeChannelMemberRoute, async (c) => {
    const channel = c.get("channel");
    const targetUserId = asUserId(c.req.valid("param").userId);

    if (channel.createdBy === targetUserId) {
      return c.json({ error: "Cannot remove the channel creator" }, 400);
    }

    await removeChannelMember(channel.id, targetUserId);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:member-removed", {
      channelId: channel.id,
      userId: targetUserId,
    });

    // Remove the target user's sockets from the channel room
    const socketIds = getSocketIdsForUser(targetUserId);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.leave(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 200);
  })
  .openapi(markReadRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    await markChannelAsRead(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  });

export default app;
