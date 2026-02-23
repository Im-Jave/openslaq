import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asMessageId } from "@openslack/shared";
import { auth } from "../auth/middleware";
import { editMessageSchema } from "./validation";
import { editMessage, deleteMessage } from "./service";
import { requireMessageChannelAccess } from "./middleware";
import { getIO } from "../socket/io";
import { rlMessageSend, rlRead } from "../rate-limit";
import { messageSchema, errorSchema, okSchema } from "../openapi/schemas";

const getMessageRoute = createRoute({
  method: "get",
  path: "/messages/:id",
  tags: ["Messages"],
  summary: "Get single message",
  description: "Returns a single message by ID.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead, requireMessageChannelAccess] as const,
  request: {
    params: z.object({ id: z.string().describe("Message ID") }),
  },
  responses: {
    200: { content: { "application/json": { schema: messageSchema } }, description: "Message" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message not found" },
  },
});

const editMessageRoute = createRoute({
  method: "put",
  path: "/messages/:id",
  tags: ["Messages"],
  summary: "Edit message",
  description: "Edits a message. Only the message author can edit.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().describe("Message ID") }),
    body: { content: { "application/json": { schema: editMessageSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: messageSchema } }, description: "Updated message" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message not found or not yours" },
  },
});

const deleteMessageRoute = createRoute({
  method: "delete",
  path: "/messages/:id",
  tags: ["Messages"],
  summary: "Delete message",
  description: "Deletes a message. Only the message author can delete.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().describe("Message ID") }),
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Message deleted" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Message not found or not yours" },
  },
});

const app = new OpenAPIHono()
  .openapi(getMessageRoute, async (c) => {
    const message = c.get("message");
    return c.json(message as any, 200);
  })
  .openapi(editMessageRoute, async (c) => {
    const user = c.get("user");
    const messageId = asMessageId(c.req.valid("param").id);
    const { content } = c.req.valid("json");
    const updated = await editMessage(messageId, user.id, content);

    if (!updated) {
      return c.json({ error: "Message not found or not yours" }, 404);
    }

    const io = getIO();
    io.to(`channel:${updated.channelId}`).emit("message:updated", updated);

    return c.json(updated as any, 200);
  })
  .openapi(deleteMessageRoute, async (c) => {
    const user = c.get("user");
    const messageId = asMessageId(c.req.valid("param").id);
    const deleted = await deleteMessage(messageId, user.id);

    if (!deleted) {
      return c.json({ error: "Message not found or not yours" }, 404);
    }

    const io = getIO();
    io.to(`channel:${deleted.channelId}`).emit("message:deleted", { id: deleted.id, channelId: deleted.channelId });

    return c.json({ ok: true as const }, 200);
  });

export default app;
