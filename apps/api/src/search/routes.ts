import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { searchQuerySchema } from "./validation";
import { searchMessages } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { searchResultsSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const searchRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Search"],
  summary: "Search messages",
  description: "Full-text search across messages in the workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    query: searchQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: searchResultsSchema } },
      description: "Search results",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>().openapi(searchRoute, async (c) => {
  const workspace = c.get("workspace");
  const user = c.get("user");
  const params = c.req.valid("query");
  const result = await searchMessages(
    workspace.id,
    user.id,
    params,
  );
  return jsonResponse(c, result, 200);
});

export default app;
