import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("channel topic / description", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a test channel
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `topic-test-${testId()}`, description: "initial description" },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;
  });

  test("PATCH updates description", async () => {
    const newDesc = `Updated topic ${testId()}`;
    const res = await client.api.workspaces[":slug"].channels[":id"].$patch({
      param: { slug, id: channelId },
      json: { description: newDesc },
    });
    expect(res.status).toBe(200);
    const channel = (await res.json()) as { id: string; description: string | null };
    expect(channel.description).toBe(newDesc);
  });

  test("PATCH with null clears description", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].$patch({
      param: { slug, id: channelId },
      json: { description: null },
    });
    expect(res.status).toBe(200);
    const channel = (await res.json()) as { id: string; description: string | null };
    expect(channel.description).toBeNull();
  });

  test("description persists through GET list", async () => {
    const desc = `persistent-${testId()}`;
    await client.api.workspaces[":slug"].channels[":id"].$patch({
      param: { slug, id: channelId },
      json: { description: desc },
    });

    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const channels = (await listRes.json()) as Array<{ id: string; description: string | null }>;
    const found = channels.find((c) => c.id === channelId);
    expect(found).toBeDefined();
    expect(found!.description).toBe(desc);
  });

  test("non-member gets 403", async () => {
    const ctx2 = await createTestClient({
      id: `topic-nonmember-${testId()}`,
      displayName: "Non-Member",
      email: `nonmember-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    // User 2 is NOT a member of the workspace or channel
    const res = await ctx2.client.api.workspaces[":slug"].channels[":id"].$patch({
      param: { slug, id: channelId },
      json: { description: "should fail" },
    });
    // Should be 403 (not a member) or 404 (workspace not found)
    expect([403, 404]).toContain(res.status);
  });
});
