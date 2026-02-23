import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { getUserById, updateUser } from "./service";
import { rlProfileUpdate, rlRead } from "../rate-limit";
import { userSchema, errorSchema } from "../openapi/schemas";

const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Returns the authenticated user's profile.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead] as const,
  responses: {
    200: { content: { "application/json": { schema: userSchema } }, description: "User profile" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "User not found" },
  },
});

const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Update current user profile",
  description: "Updates the authenticated user's display name and/or avatar.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            displayName: z.string().optional(),
            avatarUrl: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: userSchema } }, description: "Updated user profile" },
  },
});

const app = new OpenAPIHono()
  .openapi(getMeRoute, async (c) => {
    const authUser = c.get("user");
    const user = await getUserById(authUser.id);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user as any, 200);
  })
  .openapi(updateMeRoute, async (c) => {
    const authUser = c.get("user");
    await updateUser(authUser.id, c.req.valid("json"));
    const user = await getUserById(authUser.id);
    return c.json(user as any, 200);
  });

export default app;
