import { createMiddleware } from "hono/factory";
import { asMessageId, asChannelId } from "@openslack/shared";
import type { Message } from "@openslack/shared";
import type { AuthEnv } from "../auth/types";
import { getMessageById } from "./service";
import { isChannelMember } from "../channels/service";

export type MessageEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & {
    message: Message;
  };
};

export const requireMessageChannelAccess = createMiddleware<MessageEnv>(async (c, next) => {
  const messageId = asMessageId(c.req.param("id")!);
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
