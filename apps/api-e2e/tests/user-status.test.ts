import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("user status", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let userId: string;
  let slug: string;

  beforeAll(async () => {
    userId = `status-user-${testId()}`;
    const ctx = await createTestClient({
      id: userId,
      displayName: "Status User",
      email: `status-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  test("GET /me returns null status fields by default", async () => {
    const res = await client.api.users.me.$get();
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    };
    expect(data.statusEmoji).toBeNull();
    expect(data.statusText).toBeNull();
    expect(data.statusExpiresAt).toBeNull();
  });

  test("PUT /me/status sets status fields", async () => {
    const res = await client.api.users.me.status.$put({
      json: {
        emoji: "\u{1F3E0}",
        text: "Working remotely",
      },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    };
    expect(data.statusEmoji).toBe("\u{1F3E0}");
    expect(data.statusText).toBe("Working remotely");
    expect(data.statusExpiresAt).toBeNull();
  });

  test("GET /me returns set status", async () => {
    const res = await client.api.users.me.$get();
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      statusEmoji: string | null;
      statusText: string | null;
    };
    expect(data.statusEmoji).toBe("\u{1F3E0}");
    expect(data.statusText).toBe("Working remotely");
  });

  test("PUT /me/status with expiresAt sets expiration", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await client.api.users.me.status.$put({
      json: {
        emoji: "\u{1F4C5}",
        text: "In a meeting",
        expiresAt: future,
      },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    };
    expect(data.statusEmoji).toBe("\u{1F4C5}");
    expect(data.statusText).toBe("In a meeting");
    expect(data.statusExpiresAt).toBeTruthy();
  });

  test("DELETE /me/status clears all status fields", async () => {
    const delRes = await client.api.users.me.status.$delete();
    expect(delRes.status).toBe(200);

    const res = await client.api.users.me.$get();
    const data = (await res.json()) as {
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    };
    expect(data.statusEmoji).toBeNull();
    expect(data.statusText).toBeNull();
    expect(data.statusExpiresAt).toBeNull();
  });

  test("expired status returns null on GET /me (check-on-read)", async () => {
    // Set status with an already-expired timestamp
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    await client.api.users.me.status.$put({
      json: {
        emoji: "\u{1F912}",
        text: "Out sick",
        expiresAt: past,
      },
    });

    const res = await client.api.users.me.$get();
    const data = (await res.json()) as {
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    };
    expect(data.statusEmoji).toBeNull();
    expect(data.statusText).toBeNull();
    expect(data.statusExpiresAt).toBeNull();
  });

  test("GET /presence includes status fields", async () => {
    // Set a non-expired status
    await client.api.users.me.status.$put({
      json: {
        emoji: "\u{1F334}",
        text: "Vacationing",
      },
    });

    const res = await client.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{
      userId: string;
      online: boolean;
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    }>;
    const entry = data.find((e) => e.userId === userId);
    expect(entry).toBeDefined();
    expect(entry!.statusEmoji).toBe("\u{1F334}");
    expect(entry!.statusText).toBe("Vacationing");
  });

  test("expired status returns null in presence", async () => {
    // Set status with an already-expired timestamp
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    await client.api.users.me.status.$put({
      json: {
        emoji: "\u{1F68C}",
        text: "Commuting",
        expiresAt: past,
      },
    });

    const res = await client.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    const data = (await res.json()) as Array<{
      userId: string;
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    }>;
    const entry = data.find((e) => e.userId === userId);
    expect(entry).toBeDefined();
    expect(entry!.statusEmoji).toBeNull();
    expect(entry!.statusText).toBeNull();
    expect(entry!.statusExpiresAt).toBeNull();
  });
});
