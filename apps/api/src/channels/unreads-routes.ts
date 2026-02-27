import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMarkAsRead } from "../rate-limit";
import { getAllUnreads } from "./unreads-service";
import { markAllChannelsAsRead } from "./read-positions-service";
import { jsonResponse, jsonOk } from "../openapi/responses";
import { okSchema } from "../openapi/schemas";
import type { UserId, WorkspaceId } from "@openslaq/shared";

const allUnreadsResponseSchema = z.object({
  channels: z.array(z.object({
    channelId: z.string(),
    channelName: z.string(),
    channelType: z.enum(["public", "private", "dm", "group_dm"]),
    messages: z.array(z.any()),
  })),
  threadMentions: z.array(z.any()),
});

const getAllUnreadsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Channels"],
  summary: "Get all unread messages across channels",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: allUnreadsResponseSchema } },
      description: "All unread messages grouped by channel",
    },
  },
});

const markAllReadRoute = createRoute({
  method: "post",
  path: "/mark-all-read",
  tags: ["Channels"],
  summary: "Mark all channels as read",
  security: [{ Bearer: [] }],
  middleware: [rlMarkAsRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "All channels marked as read",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getAllUnreadsRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const result = await getAllUnreads(user.id as UserId, workspace.id as WorkspaceId);
    return jsonResponse(c, result, 200);
  })
  .openapi(markAllReadRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    await markAllChannelsAsRead(user.id as UserId, workspace.id as WorkspaceId);
    return jsonOk(c);
  });

export default app;
