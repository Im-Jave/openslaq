import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("channel notification prefs", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `notify-test-${testId()}` },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;
  });

  test("default is 'all' (single channel)", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
      param: { slug, id: channelId },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { level: string };
    expect(body.level).toBe("all");
  });

  test("bulk fetch returns empty when no prefs set", async () => {
    const res = await client.api.workspaces[":slug"].channels["notification-prefs"].$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const prefs = (await res.json()) as Record<string, string>;
    expect(prefs[channelId]).toBeUndefined();
  });

  test("set to 'mentions' persists", async () => {
    const putRes = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId },
      json: { level: "mentions" },
    });
    expect(putRes.status).toBe(200);

    const getRes = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
      param: { slug, id: channelId },
    });
    const body = (await getRes.json()) as { level: string };
    expect(body.level).toBe("mentions");
  });

  test("set to 'muted' persists", async () => {
    const putRes = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId },
      json: { level: "muted" },
    });
    expect(putRes.status).toBe(200);

    const getRes = await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
      param: { slug, id: channelId },
    });
    const body = (await getRes.json()) as { level: string };
    expect(body.level).toBe("muted");
  });

  test("set to 'muted' appears in bulk fetch", async () => {
    // Ensure muted from previous test
    await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId },
      json: { level: "muted" },
    });

    const res = await client.api.workspaces[":slug"].channels["notification-prefs"].$get({
      param: { slug },
    });
    const prefs = (await res.json()) as Record<string, string>;
    expect(prefs[channelId]).toBe("muted");
  });

  test("reset to 'all' removes from bulk fetch", async () => {
    await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId },
      json: { level: "all" },
    });

    const res = await client.api.workspaces[":slug"].channels["notification-prefs"].$get({
      param: { slug },
    });
    const prefs = (await res.json()) as Record<string, string>;
    expect(prefs[channelId]).toBeUndefined();
  });

  test("per-user isolation", async () => {
    // User 1 sets muted
    await client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId },
      json: { level: "muted" },
    });

    // User 2 joins workspace and channel
    const ctx2 = await createTestClient({
      id: `notify-user2-${testId()}`,
      displayName: "Notify User 2",
      email: `notifyuser2-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    await addToWorkspace(client, slug, ctx2.client);

    // Join the channel
    await ctx2.client.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });

    // User 2's pref should be default ('all')
    const getRes = await ctx2.client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
      param: { slug, id: channelId },
    });
    const body = (await getRes.json()) as { level: string };
    expect(body.level).toBe("all");

    // User 2's bulk fetch should not contain the channel
    const bulkRes = await ctx2.client.api.workspaces[":slug"].channels["notification-prefs"].$get({
      param: { slug },
    });
    const prefs = (await bulkRes.json()) as Record<string, string>;
    expect(prefs[channelId]).toBeUndefined();
  });

  test("requires channel membership", async () => {
    const ctx2 = await createTestClient({
      id: `notify-nonmember-${testId()}`,
      displayName: "Non-Member",
      email: `nonmember-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    // User 2 is NOT a member of the workspace or channel
    const res = await ctx2.client.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId },
      json: { level: "muted" },
    });
    expect([403, 404]).toContain(res.status);
  });
});
