import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asUserId } from "@openslack/shared";
import { createDmSchema } from "./validation";
import { getOrCreateDm, listDms } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { dmChannelResponseSchema, dmListItemSchema, errorSchema } from "../openapi/schemas";

const createDmRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["DMs"],
  summary: "Get or create DM channel",
  description: "Gets an existing DM channel with the specified user, or creates one.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    body: { content: { "application/json": { schema: createDmSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: dmChannelResponseSchema } },
      description: "Existing DM channel",
    },
    201: {
      content: { "application/json": { schema: dmChannelResponseSchema } },
      description: "Newly created DM channel",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "User is not a workspace member",
    },
  },
});

const listDmsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["DMs"],
  summary: "List DM channels",
  description: "Returns all DM channels for the authenticated user in this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(dmListItemSchema) } },
      description: "List of DM channels",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(createDmRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const { userId: targetUserId } = c.req.valid("json");

    const result = await getOrCreateDm(workspace.id, user.id, asUserId(targetUserId));
    if (!result) {
      return c.json({ error: "User is not a member of this workspace" }, 400);
    }

    const body = { channel: result.channel, otherUser: result.otherUser };
    if (result.created) {
      return c.json(body as any, 201);
    }
    return c.json(body as any, 200);
  })
  .openapi(listDmsRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const dms = await listDms(workspace.id, user.id);
    return c.json(dms as any, 200);
  });

export default app;
