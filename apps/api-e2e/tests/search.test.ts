import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("search", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;
  let channel2Id: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create channels
    const ch1Res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `search-ch-${testId()}` },
    });
    const ch1 = (await ch1Res.json()) as { id: string };
    channelId = ch1.id;

    const ch2Res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `search-ch2-${testId()}` },
    });
    const ch2 = (await ch2Res.json()) as { id: string };
    channel2Id = ch2.id;

    // Seed messages
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "The quick brown fox jumps over the lazy dog" },
    });
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "PostgreSQL full-text search is powerful" },
    });
    await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel2Id },
      json: { content: "Another fox story in channel two" },
    });

    // Give PostgreSQL a moment to update tsvector
    await new Promise((r) => setTimeout(r, 100));
  });

  test("search by keyword returns matching messages", async () => {
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { messageId: string; content: string }[]; total: number };
    expect(body.total).toBe(2);
    expect(body.results.length).toBe(2);
    // Results should have content
    expect(body.results[0]!.content).toBeDefined();
  });

  test("channel filter narrows results", async () => {
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox", channelId },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { channelId: string }[]; total: number };
    expect(body.total).toBe(1);
    expect(body.results[0]!.channelId).toBe(channelId);
  });

  test("user filter works", async () => {
    const uid = testId();
    const { client: client2 } = await createTestClient({
      id: `search-user2-${uid}`,
      displayName: "Search User 2",
      email: `search-user2-${uid}@openslack.dev`,
    });
    await addToWorkspace(client, slug, client2);
    const joinRes = await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    const token = `user-filter-${uid}`;

    const msg1Res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `owner ${token}` },
    });
    expect(msg1Res.status).toBe(201);
    const msg1 = (await msg1Res.json()) as { userId: string };

    const msg2Res = await client2.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `member ${token}` },
    });
    expect(msg2Res.status).toBe(201);
    const msg2 = (await msg2Res.json()) as { userId: string };

    await new Promise((r) => setTimeout(r, 100));

    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: token, userId: msg1.userId },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { userId: string }[]; total: number };
    expect(body.total).toBe(1);
    expect(body.results.length).toBe(1);
    expect(body.results[0]!.userId).toBe(msg1.userId);

    const resUser2 = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: token, userId: msg2.userId },
    });
    expect(resUser2.status).toBe(200);
    const bodyUser2 = (await resUser2.json()) as { results: { userId: string }[]; total: number };
    expect(bodyUser2.total).toBe(1);
    expect(bodyUser2.results.length).toBe(1);
    expect(bodyUser2.results[0]!.userId).toBe(msg2.userId);
  });

  test("offset pagination works", async () => {
    const page1 = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox", limit: 1, offset: 0 },
    });
    const body1 = (await page1.json()) as { results: { messageId: string }[]; total: number };
    expect(body1.results.length).toBe(1);
    expect(body1.total).toBe(2);

    const page2 = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox", limit: 1, offset: 1 },
    });
    const body2 = (await page2.json()) as { results: { messageId: string }[]; total: number };
    expect(body2.results.length).toBe(1);
    expect(body2.results[0]!.messageId).not.toBe(body1.results[0]!.messageId);
  });

  test("fromDate filter narrows results", async () => {
    // Use a future date so no messages match
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox", fromDate: futureDate },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number };
    expect(body.total).toBe(0);
  });

  test("toDate filter narrows results", async () => {
    // Use a past date so no messages match
    const pastDate = new Date("2000-01-01T00:00:00Z").toISOString();
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox", toDate: pastDate },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number };
    expect(body.total).toBe(0);
  });

  test("date range that includes messages returns results", async () => {
    const pastDate = new Date("2000-01-01T00:00:00Z").toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox", fromDate: pastDate, toDate: futureDate },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number };
    expect(body.total).toBe(2);
  });

  test("empty query returns 400", async () => {
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "" },
    });
    expect(res.status as number).toBe(400);
  });

  test("only returns messages from channels user is a member of", async () => {
    // Create a second user who is a workspace member but NOT a channel member
    const { client: client2 } = await createTestClient({
      id: `search-outsider-${testId()}`,
      displayName: "Outsider",
      email: `outsider-${testId()}@openslack.dev`,
    });
    await addToWorkspace(client, slug, client2);
    // Search should return 0 results because they are not channel members
    const res = await client2.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "fox" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; total: number };
    expect(body.total).toBe(0);
  });

  test("messages-around endpoint returns surrounding messages", async () => {
    // Send several messages
    const msgs: string[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: channelId },
        json: { content: `around-msg-${i}-${testId()}` },
      });
      const msg = (await res.json()) as { id: string };
      msgs.push(msg.id);
    }

    // Fetch around the middle message
    const targetId = msgs[2]!;
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.around[":messageId"].$get({
      param: { slug, id: channelId, messageId: targetId },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { id: string }[]; targetFound: boolean };
    expect(body.targetFound).toBe(true);
    expect(body.messages.length).toBeGreaterThanOrEqual(3);
    // Target should be in the results
    expect(body.messages.some((m) => m.id === targetId)).toBe(true);
  });
});
