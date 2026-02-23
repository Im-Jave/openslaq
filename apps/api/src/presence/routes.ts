import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { getWorkspacePresence } from "./service";
import { rlRead } from "../rate-limit";
import { presenceEntrySchema } from "../openapi/schemas";
import { z } from "@hono/zod-openapi";

const getPresenceRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Presence"],
  summary: "Get workspace presence",
  description: "Returns all online users in the workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(presenceEntrySchema) } },
      description: "List of online users",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>().openapi(getPresenceRoute, async (c) => {
  const workspace = c.get("workspace");
  const presence = await getWorkspacePresence(workspace.id);
  return c.json(presence as any, 200);
});

export default app;
