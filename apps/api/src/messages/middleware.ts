import { createMiddleware } from "hono/factory";
import { asMessageId, asChannelId } from "@openslaq/shared";
import type { Message } from "@openslaq/shared";
import type { AuthEnv } from "../auth/types";
import { getMessageById } from "./service";
import { isChannelMember } from "../channels/service";

export type MessageEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & {
    message: Message;
  };
};

export const requireMessageChannelAccess = createMiddleware<MessageEnv>(async (c, next) => {
  const idParam = c.req.param("id");
  if (!idParam) {
    return c.json({ error: "Message not found" }, 404);
  }
  const messageId = asMessageId(idParam);
  const user = c.get("user");

  const message = await getMessageById(messageId);
  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }

  const isMember = await isChannelMember(asChannelId(message.channelId), user.id);
  if (!isMember) {
    return c.json({ error: "Message not found" }, 404);
  }

  c.set("message", message);
  await next();
});
