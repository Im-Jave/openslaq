import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("starred channels", () => {
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
      json: { name: `star-test-${testId()}` },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;
  });

  test("star channel → GET starred includes it", async () => {
    const starRes = await client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channelId },
    });
    expect(starRes.status).toBe(200);

    const listRes = await client.api.workspaces[":slug"].channels.starred.$get({
      param: { slug },
    });
    expect(listRes.status).toBe(200);
    const ids = (await listRes.json()) as string[];
    expect(ids).toContain(channelId);
  });

  test("unstar → no longer in list", async () => {
    // Ensure starred first
    await client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channelId },
    });

    const unstarRes = await client.api.workspaces[":slug"].channels[":id"].star.$delete({
      param: { slug, id: channelId },
    });
    expect(unstarRes.status).toBe(200);

    const listRes = await client.api.workspaces[":slug"].channels.starred.$get({
      param: { slug },
    });
    const ids = (await listRes.json()) as string[];
    expect(ids).not.toContain(channelId);
  });

  test("star is idempotent (double-star no error)", async () => {
    const res1 = await client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channelId },
    });
    expect(res1.status).toBe(200);

    const res2 = await client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channelId },
    });
    expect(res2.status).toBe(200);

    // Should only appear once
    const listRes = await client.api.workspaces[":slug"].channels.starred.$get({
      param: { slug },
    });
    const ids = (await listRes.json()) as string[];
    const count = ids.filter((id) => id === channelId).length;
    expect(count).toBe(1);
  });

  test("per-user isolation", async () => {
    // User 1 stars channel
    await client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channelId },
    });

    // User 2 joins workspace
    const ctx2 = await createTestClient({
      id: `star-user2-${testId()}`,
      displayName: "Star User 2",
      email: `staruser2-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    await addToWorkspace(client, slug, ctx2.client);

    // User 2's starred list should be empty
    const listRes = await ctx2.client.api.workspaces[":slug"].channels.starred.$get({
      param: { slug },
    });
    const ids = (await listRes.json()) as string[];
    expect(ids).not.toContain(channelId);
  });

  test("cannot star channel user isn't a member of", async () => {
    const ctx2 = await createTestClient({
      id: `star-nonmember-${testId()}`,
      displayName: "Non-Member",
      email: `nonmember-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    // User 2 is NOT a member of the workspace or channel
    const res = await ctx2.client.api.workspaces[":slug"].channels[":id"].star.$post({
      param: { slug, id: channelId },
    });
    expect([403, 404]).toContain(res.status);
  });
});
