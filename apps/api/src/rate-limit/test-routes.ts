import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { env } from "../env";
import { resetStore, setEnabled } from "./store";

const requireTestSecret = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${env.E2E_TEST_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

const app = new Hono()
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
  });

export default app;
