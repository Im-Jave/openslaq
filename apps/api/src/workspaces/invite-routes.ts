import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createInviteSchema } from "./invite-validation";
import { createInvite, listInvites, revokeInvite } from "./invite-service";
import { requireRole, type WorkspaceMemberEnv } from "./role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlInviteAdmin, rlRead } from "../rate-limit";
import { workspaceInviteSchema, okSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

function toInviteResponse(invite: {
  id: string;
  workspaceId: string;
  code: string;
  createdBy: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    code: invite.code,
    createdBy: invite.createdBy,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  };
}

const listInvitesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Invites"],
  summary: "List workspace invites",
  description: "Returns all invites for the workspace. Requires admin permissions.",
  security: [{ Bearer: [] }],
  middleware: [requireRole(ROLES.ADMIN), rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(workspaceInviteSchema) } },
      description: "Workspace invites",
    },
  },
});

const createInviteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Invites"],
  summary: "Create invite",
  description: "Creates a new workspace invite link. Requires admin permissions.",
  security: [{ Bearer: [] }],
  middleware: [requireRole(ROLES.ADMIN), rlInviteAdmin] as const,
  request: {
    body: { content: { "application/json": { schema: createInviteSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: workspaceInviteSchema } },
      description: "Created invite",
    },
  },
});

const revokeInviteRoute = createRoute({
  method: "delete",
  path: "/:inviteId",
  tags: ["Invites"],
  summary: "Revoke invite",
  description: "Revokes a workspace invite. Requires admin permissions.",
  security: [{ Bearer: [] }],
  middleware: [requireRole(ROLES.ADMIN), rlInviteAdmin] as const,
  request: {
    params: z.object({ inviteId: z.string().describe("Invite ID") }),
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Invite revoked" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Invite not found" },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listInvitesRoute, async (c) => {
    const workspace = c.get("workspace");
    const invites = await listInvites(workspace.id);
    return jsonResponse(c, invites.map(toInviteResponse), 200);
  })
  .openapi(createInviteRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const { maxUses, expiresInHours } = c.req.valid("json");

    const invite = await createInvite(
      workspace.id,
      user.id,
      maxUses,
      expiresInHours,
    );

    return jsonResponse(c, toInviteResponse(invite), 201);
  })
  .openapi(revokeInviteRoute, async (c) => {
    const workspace = c.get("workspace");
    const { inviteId } = c.req.valid("param");

    const revoked = await revokeInvite(inviteId, workspace.id);
    if (!revoked) {
      return c.json({ error: "Invite not found" }, 404);
    }

    return c.json({ ok: true as const }, 200);
  });

export default app;
