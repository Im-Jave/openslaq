import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createArtificialDelayMiddleware } from "../../api/src/middleware/artificial-delay";

describe("artificial delay middleware", () => {
  test("adds configured delay before handling the request", async () => {
    const app = new Hono();
    app.use("*", createArtificialDelayMiddleware(80));
    app.get("/health", (c) => c.json({ ok: true as const }));

    const startedAt = performance.now();
    const res = await app.request("http://localhost/health");
    const elapsedMs = performance.now() - startedAt;

    expect(res.status).toBe(200);
    expect(elapsedMs).toBeGreaterThanOrEqual(70);
  });

  test("does not delay when configured with zero", async () => {
    const app = new Hono();
    app.use("*", createArtificialDelayMiddleware(0));
    app.get("/health", (c) => c.json({ ok: true as const }));

    const startedAt = performance.now();
    const res = await app.request("http://localhost/health");
    const elapsedMs = performance.now() - startedAt;

    expect(res.status).toBe(200);
    expect(elapsedMs).toBeLessThan(70);
  });
});
