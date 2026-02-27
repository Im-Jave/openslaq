import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { asUserId, type BotScope, type UserId } from "@openslaq/shared";
import { db } from "../db";
import { botApps } from "./schema";
import { hashToken } from "./token";

export interface BotAuthEnv {
  Variables: {
    user: { id: UserId; email: string; displayName: string };
    isBot: boolean;
    botAppId: string;
    botScopes: BotScope[];
    botWorkspaceId: string;
  };
}

export const botAuth = createMiddleware<BotAuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer osb_")) {
    return c.json({ error: "Invalid bot token" }, 401);
  }

  const token = authHeader.slice(7);
  const hash = hashToken(token);

  const bot = await db.query.botApps.findFirst({
    where: eq(botApps.apiToken, hash),
  });

  if (!bot) {
    return c.json({ error: "Invalid bot token" }, 401);
  }

  if (!bot.enabled) {
    return c.json({ error: "Bot is disabled" }, 403);
  }

  c.set("user", {
    id: asUserId(bot.userId),
    email: `${bot.name.toLowerCase().replace(/\s+/g, "-")}@bot.openslaq`,
    displayName: bot.name,
  });
  c.set("isBot", true);
  c.set("botAppId", bot.id);
  c.set("botScopes", bot.scopes as BotScope[]);
  c.set("botWorkspaceId", bot.workspaceId);

  await next();
});

export function requireScope(scope: BotScope) {
  return createMiddleware<BotAuthEnv>(async (c, next) => {
    const scopes = c.get("botScopes");
    if (!scopes?.includes(scope)) {
      return c.json({ error: `Missing required scope: ${scope}` }, 403);
    }
    await next();
  });
}
