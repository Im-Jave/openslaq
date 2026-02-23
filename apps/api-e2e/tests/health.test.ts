import { describe, test, expect } from "bun:test";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

describe("health", () => {
  test("GET /health returns ok", async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
