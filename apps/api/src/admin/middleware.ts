import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../auth/types";
import { env } from "../env";

const adminUserIds = new Set(
  env.ADMIN_USER_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  if (!isAdmin(user.id)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});
