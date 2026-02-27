import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import type { AuthEnv } from "../auth/types";
import { getInviteByCode, acceptInvite } from "./invite-service";
import { getWorkspaceById } from "./service";
import { asWorkspaceId } from "@openslaq/shared";
import { rlInvitePreview, rlInviteAccept } from "../rate-limit";
import { invitePreviewSchema, inviteAcceptSchema, errorSchema } from "../openapi/schemas";

const previewInviteRoute = createRoute({
  method: "get",
  path: "/:code",
  tags: ["Invites"],
  summary: "Preview invite",
  description: "Returns workspace info for an invite code without accepting it.",
  security: [{ Bearer: [] }],
  middleware: [rlInvitePreview, auth] as const,
  request: {
    params: z.object({ code: z.string().describe("Invite code") }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: invitePreviewSchema } },
      description: "Invite preview",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invite not found",
    },
    410: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invite revoked, expired, or max uses reached",
    },
  },
});

const acceptInviteRoute = createRoute({
  method: "post",
  path: "/:code/accept",
  tags: ["Invites"],
  summary: "Accept invite",
  description: "Accepts a workspace invite and joins the workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlInviteAccept, auth] as const,
  request: {
    params: z.object({ code: z.string().describe("Invite code") }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: inviteAcceptSchema } },
      description: "Invite accepted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invite not found",
    },
    410: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invite revoked, expired, or max uses reached",
    },
  },
});

const app = new OpenAPIHono<AuthEnv>()
  .openapi(previewInviteRoute, async (c) => {
    const { code } = c.req.valid("param");
    const invite = await getInviteByCode(code);

    if (!invite) return c.json({ error: "Invite not found" }, 404);
    if (invite.revokedAt) return c.json({ error: "Invite has been revoked" }, 410);
    if (invite.expiresAt && invite.expiresAt < new Date())
      return c.json({ error: "Invite has expired" }, 410);
    if (invite.maxUses && invite.useCount >= invite.maxUses)
      return c.json({ error: "Invite has reached maximum uses" }, 410);

    const workspace = await getWorkspaceById(asWorkspaceId(invite.workspaceId));
    if (!workspace) return c.json({ error: "Workspace not found" }, 404);

    return c.json({ workspaceName: workspace.name, workspaceSlug: workspace.slug }, 200);
  })
  .openapi(acceptInviteRoute, async (c) => {
    const { code } = c.req.valid("param");
    const user = c.get("user");

    const result = await acceptInvite(code, user.id);
    if ("error" in result) {
      if (result.error === "Invite not found") {
        return c.json({ error: result.error as string }, 404);
      }
      return c.json({ error: result.error as string }, 410);
    }

    return c.json({ slug: result.workspace.slug }, 200);
  });

export default app;
