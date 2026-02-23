import { describe, test, expect } from "bun:test";
import { createTestClient } from "./helpers/api-client";

describe("auth", () => {
  test("no auth header → 401", async () => {
    const { client } = await createTestClient();
    // Make a raw fetch without auth headers
    const res = await client.api.users.me.$get(undefined as never, {
      headers: { Authorization: "" },
    });
    expect(res.status as number).toBe(401);
  });

  test("invalid token → 401", async () => {
    const { client } = await createTestClient();
    const res = await client.api.users.me.$get(undefined as never, {
      headers: { Authorization: "Bearer invalid-garbage-token" },
    });
    expect(res.status as number).toBe(401);
  });

  test("valid HMAC token → 200", async () => {
    const { client } = await createTestClient();
    const res = await client.api.users.me.$get();
    expect(res.status).toBe(200);
  });
});
