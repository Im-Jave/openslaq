import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { resetStore, setEnabled } from "./store";
import { db } from "../db";
import { webhookDeliveries } from "../bots/schema";

const requireTestSecret = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${env.E2E_TEST_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

const app = new Hono()
  // Public test endpoints (no auth required — used as webhook targets)
  .post("/webhook-echo-update", (c) => {
    return c.json({
      updateMessage: {
        content: "Updated by webhook",
        actions: [{ id: "done", type: "button", label: "Done", style: "primary" }],
      },
    });
  })
  // Protected test endpoints
  .use(requireTestSecret)
  .post("/reset-rate-limits", (c) => {
    resetStore();
    setEnabled(true);
    return c.json({ ok: true });
  })
  .post("/disable-rate-limits", (c) => {
    resetStore();
    setEnabled(false);
    return c.json({ ok: true });
  })
  .get("/webhook-deliveries/:botAppId", async (c) => {
    const botAppId = c.req.param("botAppId");
    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.botAppId, botAppId));
    return c.json(rows);
  });

export default app;
