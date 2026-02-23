import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asMessageId } from "@openslack/shared";
import { createMessageSchema, messagesPaginationSchema } from "./validation";
import { getMessages, createMessage, getThreadReplies, createThreadReply, getMessagesAround, AttachmentLinkError } from "./service";
import { getIO } from "../socket/io";
import { resolveChannel, requireChannelMember } from "../channels/middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlMessageSend, rlRead } from "../rate-limit";
import { messageListSchema, messageSchema, messagesAroundSchema, errorSchema } from "../openapi/schemas";

const channelIdParam = z.object({ id: z.string().describe("Channel ID") });

const getMessagesRoute = createRoute({
  method: "get",
  path: "/:id/messages",
  tags: ["Messages"],
  summary: "List channel messages",
  description: "Returns paginated messages in a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    query: messagesPaginationSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageListSchema } },
      description: "Paginated messages",
    },
  },
});

const createMessageRoute = createRoute({
  method: "post",
  path: "/:id/messages",
  tags: ["Messages"],
  summary: "Send message",
  description: "Sends a message to a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: createMessageSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: messageSchema } },
      description: "Created message",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invalid attachment IDs",
    },
  },
});

const getMessagesAroundRoute = createRoute({
  method: "get",
  path: "/:id/messages/around/:messageId",
  tags: ["Messages"],
  summary: "Get messages around target",
  description: "Returns messages surrounding a specific message, useful for scrolling to a message.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: z.string().describe("Channel ID"),
      messageId: z.string().describe("Target message ID"),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messagesAroundSchema } },
      description: "Messages around target",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found",
    },
  },
});

const getThreadRepliesRoute = createRoute({
  method: "get",
  path: "/:id/messages/:messageId/replies",
  tags: ["Messages"],
  summary: "Get thread replies",
  description: "Returns paginated replies to a message thread.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: z.string().describe("Channel ID"),
      messageId: z.string().describe("Parent message ID"),
    }),
    query: messagesPaginationSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageListSchema } },
      description: "Thread replies",
    },
  },
});

const createThreadReplyRoute = createRoute({
  method: "post",
  path: "/:id/messages/:messageId/replies",
  tags: ["Messages"],
  summary: "Reply to thread",
  description: "Creates a reply in a message thread.",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: z.string().describe("Channel ID"),
      messageId: z.string().describe("Parent message ID"),
    }),
    body: { content: { "application/json": { schema: createMessageSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: messageSchema } },
      description: "Created reply",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Cannot reply to a reply or invalid attachment IDs",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Parent message not found",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getMessagesRoute, async (c) => {
    const channel = c.get("channel");
    const { cursor, limit, direction } = c.req.valid("query");
    const result = await getMessages(channel.id, cursor, limit, direction);
    return c.json(result as any, 200);
  })
  .openapi(createMessageRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    const { content, attachmentIds } = c.req.valid("json");

    try {
      const message = await createMessage(channel.id, user.id, content, attachmentIds);
      const io = getIO();
      io.to(`channel:${channel.id}`).emit("message:new", message);
      return c.json(message as any, 201);
    } catch (e) {
      if (e instanceof AttachmentLinkError) {
        return c.json({ error: e.message }, 400);
      }
      throw e;
    }
  })
  .openapi(getMessagesAroundRoute, async (c) => {
    const channel = c.get("channel");
    const messageId = asMessageId(c.req.valid("param").messageId);
    const result = await getMessagesAround(channel.id, messageId);
    if (!result.targetFound) {
      return c.json({ error: "Message not found" }, 404);
    }
    return c.json(result as any, 200);
  })
  .openapi(getThreadRepliesRoute, async (c) => {
    const messageId = asMessageId(c.req.valid("param").messageId);
    const { cursor, limit } = c.req.valid("query");
    const result = await getThreadReplies(messageId, cursor, limit);
    return c.json(result as any, 200);
  })
  .openapi(createThreadReplyRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    const messageId = asMessageId(c.req.valid("param").messageId);
    const { content, attachmentIds } = c.req.valid("json");

    try {
      const result = await createThreadReply(messageId, channel.id, user.id, content, attachmentIds);

      if ("error" in result) {
        if (result.error === "Cannot reply to a reply") {
          return c.json({ error: result.error }, 400);
        }
        return c.json({ error: result.error }, 404);
      }

      const io = getIO();
      io.to(`channel:${channel.id}`).emit("message:new", result.reply);
      io.to(`channel:${channel.id}`).emit("thread:updated", result.threadUpdate);

      return c.json(result.reply as any, 201);
    } catch (e) {
      if (e instanceof AttachmentLinkError) {
        return c.json({ error: e.message }, 400);
      }
      throw e;
    }
  });

export default app;
