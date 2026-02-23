import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

describe("threads", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let headers: Record<string, string>;
  let slug: string;
  let channelId: string;
  let parentMessageId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    headers = ctx.headers;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a dedicated test channel
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `thread-test-${testId()}`, description: "thread tests" },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;

    // Create a parent message
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `parent-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };
    parentMessageId = msg.id;
  });

  test("create thread reply → 201", async () => {
    const content = `reply-${testId()}`;
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parentMessageId },
      json: { content },
    });
    expect(res.status).toBe(201);
    const reply = (await res.json()) as { id: string; content: string; parentMessageId: string };
    expect(reply.content).toBe(content);
    expect(reply.parentMessageId).toBe(parentMessageId);
  });

  test("list thread replies", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get({
      param: { slug, id: channelId, messageId: parentMessageId },
      query: {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { id: string; parentMessageId: string }[] };
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBeGreaterThanOrEqual(1);
    // All replies should reference the parent
    for (const reply of body.messages) {
      expect(reply.parentMessageId).toBe(parentMessageId);
    }
  });

  test("parent replyCount updates after replies", async () => {
    // Create a fresh parent for counting
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `count-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 2 replies
    for (let i = 0; i < 2; i++) {
      await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `count-reply-${i}-${testId()}` },
      });
    }

    // Check parent's replyCount in channel message list
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string; replyCount: number }[] };
    const found = body.messages.find((m) => m.id === parent.id);
    expect(found).toBeDefined();
    expect(found!.replyCount).toBe(2);
  });

  test("thread replies excluded from channel message list", async () => {
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string; parentMessageId: string | null }[] };
    // No message in the list should have a parentMessageId
    for (const msg of body.messages) {
      expect(msg.parentMessageId).toBeNull();
    }
  });

  test("reply to a reply → 400", async () => {
    // Create a reply
    const replyRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parentMessageId },
      json: { content: `nested-reply-${testId()}` },
    });
    expect(replyRes.status).toBe(201);
    const reply = (await replyRes.json()) as { id: string };

    // Try to reply to the reply
    const nestedRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: reply.id },
      json: { content: `should-fail-${testId()}` },
    });
    expect(nestedRes.status).toBe(400);
  });

  test("delete reply decrements parent replyCount", async () => {
    // Create a fresh parent
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `del-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 2 replies
    const replyIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const rRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `del-reply-${i}-${testId()}` },
      });
      const r = (await rRes.json()) as { id: string };
      replyIds.push(r.id);
    }

    // Delete one reply
    const delRes = await client.api.messages[":id"].$delete({
      param: { id: replyIds[0]! },
    });
    expect(delRes.status).toBe(200);

    // Check parent's replyCount
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { id: string; replyCount: number }[] };
    const found = body.messages.find((m) => m.id === parent.id);
    expect(found).toBeDefined();
    expect(found!.replyCount).toBe(1);
  });

  test("get single message by ID", async () => {
    const res = await client.api.messages[":id"].$get({
      param: { id: parentMessageId },
    });
    expect(res.status).toBe(200);
    const msg = (await res.json()) as { id: string; content: string; replyCount: number };
    expect(msg.id).toBe(parentMessageId);
    expect(msg.replyCount).toBeGreaterThanOrEqual(1);
  });

  test("thread reply pagination with cursor", async () => {
    // Create a fresh parent
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `page-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Create 3 replies with small delays to ensure distinct timestamps
    const replyIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 50));
      const rRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug, id: channelId, messageId: parent.id },
        json: { content: `page-reply-${i}-${testId()}` },
      });
      const r = (await rRes.json()) as { id: string };
      replyIds.push(r.id);
    }

    // Fetch first page with limit=1 (raw fetch to ensure query params are sent)
    const repliesUrl = `${BASE_URL}/api/workspaces/${slug}/channels/${channelId}/messages/${parent.id}/replies`;
    const page1Res = await fetch(`${repliesUrl}?limit=1`, { headers });
    expect(page1Res.status).toBe(200);
    const page1 = (await page1Res.json()) as { messages: { id: string }[]; nextCursor: string | null };
    expect(page1.messages).toHaveLength(1);
    expect(page1.nextCursor).not.toBeNull();

    // Fetch second page using cursor
    const page2Res = await fetch(`${repliesUrl}?limit=1&cursor=${page1.nextCursor}`, { headers });
    expect(page2Res.status).toBe(200);
    const page2 = (await page2Res.json()) as { messages: { id: string }[]; nextCursor: string | null };
    expect(page2.messages).toHaveLength(1);
    // Second page should have a different reply
    expect(page2.messages[0]!.id).not.toBe(page1.messages[0]!.id);
  });

  test("get nonexistent message → 404", async () => {
    const res = await client.api.messages[":id"].$get({
      param: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });
});
