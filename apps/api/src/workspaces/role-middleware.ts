import { createMiddleware } from "hono/factory";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { workspaceMembers } from "./schema";
import { hasMinimumRole } from "../auth/permissions";
import type { Role } from "@openslack/shared";
import type { WorkspaceEnv } from "./types";

export type WorkspaceMemberEnv = WorkspaceEnv & {
  Variables: WorkspaceEnv["Variables"] & {
    memberRole: Role;
  };
};

export const resolveMemberRole = createMiddleware<WorkspaceMemberEnv>(async (c, next) => {
  const workspace = c.get("workspace");
  const user = c.get("user");

  const row = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (row.length === 0) {
    return c.json({ error: "Not a workspace member" }, 403);
  }

  c.set("memberRole", row[0]!.role as Role);
  await next();
});

export function requireRole(minimumRole: Role) {
  return createMiddleware<WorkspaceMemberEnv>(async (c, next) => {
    const memberRole = c.get("memberRole");
    if (!hasMinimumRole(memberRole, minimumRole)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
  });
}
