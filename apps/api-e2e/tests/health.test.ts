import { describe, test, expect } from "bun:test";

function getApiUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

describe("health", () => {
  test("GET /health returns ok", async () => {
    const res = await fetch(`${getApiUrl()}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
