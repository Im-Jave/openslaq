import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "../auth/middleware";
import { isAdmin, requireAdmin } from "./middleware";
import { paginationSchema, activityQuerySchema } from "./validation";
import { getStats, getActivity, getUsers, getWorkspaces, createImpersonationSnippet } from "./service";
import { env } from "../env";

const app = new Hono()
  .use(auth)
  .get("/check", async (c) => {
    const user = c.get("user");
    return c.json({ isAdmin: isAdmin(user.id) });
  })
  .use(requireAdmin)
  .get("/stats", async (c) => {
    const stats = await getStats();
    return c.json(stats);
  })
  .get("/activity", zValidator("query", activityQuerySchema), async (c) => {
    const { days } = c.req.valid("query");
    const activity = await getActivity(days);
    return c.json(activity);
  })
  .get("/users", zValidator("query", paginationSchema), async (c) => {
    const params = c.req.valid("query");
    const result = await getUsers(params);
    return c.json(result);
  })
  .get("/workspaces", zValidator("query", paginationSchema), async (c) => {
    const params = c.req.valid("query");
    const result = await getWorkspaces(params);
    return c.json(result);
  })
  .post(
    "/impersonate/:userId",
    zValidator("param", z.object({ userId: z.string().regex(/^[a-zA-Z0-9_-]+$/) })),
    async (c) => {
      if (!env.STACK_SECRET_SERVER_KEY) {
        return c.json(
          { error: "Impersonation is unavailable — STACK_SECRET_SERVER_KEY is not configured" },
          503,
        );
      }
      const { userId } = c.req.valid("param");
      try {
        const snippet = await createImpersonationSnippet(
          userId,
          env.VITE_STACK_PROJECT_ID,
        );
        return c.json({ snippet });
      } catch (err) {
        console.error("Impersonation failed:", err);
        return c.json({ error: "Impersonation failed" }, 500);
      }
    },
  );

export default app;
