import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { workspaceMembers } from "./schema";
import { users } from "../users/schema";
import { requireRole, type WorkspaceMemberEnv } from "./role-middleware";
import { getWorkspaceMember, updateMemberRole, removeMember } from "./service";
import { ROLES } from "@openslack/shared";
import type { UserId } from "@openslack/shared";
import { rlRead } from "../rate-limit";
import { workspaceMemberSchema, okSchema, errorSchema } from "../openapi/schemas";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]).describe("New role"),
});

const listMembersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Workspaces"],
  summary: "List workspace members",
  description: "Returns all members of the workspace with their roles.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(workspaceMemberSchema) } },
      description: "Workspace members",
    },
  },
});

const updateRoleRoute = createRoute({
  method: "patch",
  path: "/:userId/role",
  tags: ["Workspaces"],
  summary: "Update member role",
  description: "Updates a workspace member's role. Requires admin permissions.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: z.object({ userId: z.string().describe("Target user ID") }),
    body: { content: { "application/json": { schema: updateRoleSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: workspaceMemberSchema } },
      description: "Updated member",
    },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Cannot change own role" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Insufficient permissions" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Member not found" },
  },
});

const removeMemberRoute = createRoute({
  method: "delete",
  path: "/:userId",
  tags: ["Workspaces"],
  summary: "Remove member",
  description: "Removes a member from the workspace. Requires admin permissions.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: z.object({ userId: z.string().describe("Target user ID") }),
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Member removed" },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Cannot remove yourself" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Insufficient permissions" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Member not found" },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listMembersRoute, async (c) => {
    const workspace = c.get("workspace");

    const members = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: workspaceMembers.role,
        createdAt: users.createdAt,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspace.id));

    return c.json(members as any, 200);
  })
  .openapi(updateRoleRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const targetUserId = c.req.valid("param").userId as UserId;
    const { role: newRole } = c.req.valid("json");

    if (targetUserId === user.id) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }

    const targetMember = await getWorkspaceMember(workspace.id, targetUserId);
    if (!targetMember) {
      return c.json({ error: "Member not found" }, 404);
    }

    if (targetMember.role === ROLES.OWNER) {
      return c.json({ error: "Cannot change the owner's role" }, 403);
    }

    const memberRole = c.get("memberRole");
    if (memberRole === ROLES.ADMIN && targetMember.role === ROLES.ADMIN) {
      return c.json({ error: "Admins cannot change other admins' roles" }, 403);
    }

    const updated = await updateMemberRole(workspace.id, targetUserId, newRole);
    return c.json(updated as any, 200);
  })
  .openapi(removeMemberRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const targetUserId = c.req.valid("param").userId as UserId;

    if (targetUserId === user.id) {
      return c.json({ error: "Cannot remove yourself" }, 400);
    }

    const targetMember = await getWorkspaceMember(workspace.id, targetUserId);
    if (!targetMember) {
      return c.json({ error: "Member not found" }, 404);
    }

    if (targetMember.role === ROLES.OWNER) {
      return c.json({ error: "Cannot remove the owner" }, 403);
    }

    const memberRole = c.get("memberRole");
    if (memberRole === ROLES.ADMIN && targetMember.role === ROLES.ADMIN) {
      return c.json({ error: "Admins cannot remove other admins" }, 403);
    }

    await removeMember(workspace.id, targetUserId);
    return c.json({ ok: true as const }, 200);
  });

export default app;
