import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("messages", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a dedicated test channel
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `msg-test-${testId()}`, description: "message tests" },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;
  });

  test("send message → 201", async () => {
    const content = `hello-${testId()}`;
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(res.status).toBe(201);
    const msg = (await res.json()) as { id: string; content: string; channelId: string };
    expect(msg.content).toBe(content);
    expect(msg.channelId).toBe(channelId);
    expect(msg.id).toBeDefined();
  });

  test("list messages — find sent message", async () => {
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `list-target-${testId()}` },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: { id: string }[] };
    expect(Array.isArray(body.messages)).toBe(true);
    const found = body.messages.find((m) => m.id === created.id);
    expect(found).toBeDefined();
  });

  test("edit message", async () => {
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `edit-target-${testId()}` },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const newContent = `edited-${testId()}`;
    const res = await client.api.messages[":id"].$put({
      param: { id: created.id },
      json: { content: newContent },
    });
    expect(res.status).toBe(200);
    const msg = (await res.json()) as { content: string };
    expect(msg.content).toBe(newContent);
  });

  test("delete message", async () => {
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `delete-target-${testId()}` },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const res = await client.api.messages[":id"].$delete({
      param: { id: created.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // Verify message is gone
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    const listBody = (await listRes.json()) as { messages: { id: string }[] };
    const found = listBody.messages.find((m) => m.id === created.id);
    expect(found).toBeUndefined();
  });

  test("edit nonexistent message → 404", async () => {
    const res = await client.api.messages[":id"].$put({
      param: { id: "00000000-0000-0000-0000-000000000000" },
      json: { content: "nope" },
    });
    expect(res.status).toBe(404);
  });

  test("edit another user's message → 404", async () => {
    // Send a message as the default user
    const content = `owned-by-user1-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(createRes.status).toBe(201);
    const msg = (await createRes.json()) as { id: string };

    // Try to edit it as a different user
    const uid = testId();
    const { client: client2 } = await createTestClient({
      id: `api-e2e-user-003-${uid}`,
      displayName: "Unauthorized User",
      email: `api-e2e-003-${uid}@openslack.dev`,
    });
    await addToWorkspace(client, slug, client2);
    const joinRes = await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    const res = await client2.api.messages[":id"].$put({
      param: { id: msg.id },
      json: { content: "hacked" },
    });
    expect(res.status).toBe(404);
  });

  test("delete another user's message → 404", async () => {
    // Send a message as the default user
    const content = `owned-by-user1-${testId()}`;
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(createRes.status).toBe(201);
    const msg = (await createRes.json()) as { id: string };

    // Try to delete it as a different user
    const uid = testId();
    const { client: client2 } = await createTestClient({
      id: `api-e2e-user-004-${uid}`,
      displayName: "Unauthorized Deleter",
      email: `api-e2e-004-${uid}@openslack.dev`,
    });
    await addToWorkspace(client, slug, client2);
    const joinRes = await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    const res = await client2.api.messages[":id"].$delete({
      param: { id: msg.id },
    });
    expect(res.status).toBe(404);
  });

  test("delete nonexistent message → 404", async () => {
    const res = await client.api.messages[":id"].$delete({
      param: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });

  test("empty message content → 400", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "" },
    });
    expect(res.status as number).toBe(400);
  });

  test("oversized message content → 400", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "x".repeat(10001) },
    });
    expect(res.status as number).toBe(400);
  });

  test("message pagination", async () => {
    // Create a fresh channel for pagination testing
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `paginate-${testId()}` },
    });
    const pageChan = (await chanRes.json()) as { id: string };

    // Send 3 messages
    for (let i = 0; i < 3; i++) {
      await client.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: pageChan.id },
        json: { content: `page-msg-${i}` },
      });
    }

    // Fetch with limit=2 — should get 2 messages and a nextCursor
    const page1Res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: pageChan.id },
      query: { limit: 2 },
    });
    expect(page1Res.status).toBe(200);
    const page1 = (await page1Res.json()) as {
      messages: { id: string; content: string }[];
      nextCursor: string | null;
    };
    expect(page1.messages.length).toBe(2);
    expect(page1.nextCursor).not.toBeNull();

    // Fetch page 2 using the cursor
    const page2Res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: pageChan.id },
      query: { cursor: page1.nextCursor!, limit: 2 },
    });
    expect(page2Res.status).toBe(200);
    const page2 = (await page2Res.json()) as {
      messages: { id: string; content: string }[];
      nextCursor: string | null;
    };
    expect(page2.messages.length).toBe(1);
    expect(page2.nextCursor).toBeNull();

    // All 3 message IDs should be distinct
    const allIds = [...page1.messages, ...page2.messages].map((m) => m.id);
    expect(new Set(allIds).size).toBe(3);
  });

  test("direction=newer returns messages after cursor", async () => {
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `dir-newer-${testId()}` },
    });
    const chan = (await chanRes.json()) as { id: string };

    // Send 5 messages sequentially so ordering is deterministic
    const msgIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: chan.id },
        json: { content: `newer-msg-${i}` },
      });
      const msg = (await res.json()) as { id: string };
      msgIds.push(msg.id);
    }

    // Fetch older (default), limit=2 → gets messages 4,3 (newest first)
    const olderRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: chan.id },
      query: { limit: 2 },
    });
    const olderPage = (await olderRes.json()) as {
      messages: { id: string; content: string }[];
      nextCursor: string | null;
    };
    expect(olderPage.messages.length).toBe(2);
    expect(olderPage.nextCursor).not.toBeNull();

    // Use the cursor (msg at index 3) to fetch direction=newer → should get messages newer than cursor
    const newerRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: chan.id },
      query: { cursor: olderPage.nextCursor!, direction: "newer", limit: 10 },
    });
    const newerPage = (await newerRes.json()) as {
      messages: { id: string; content: string }[];
      nextCursor: string | null;
    };
    // Should get messages newer than the cursor (excludes the cursor message itself)
    expect(newerPage.messages.length).toBeGreaterThan(0);
    // All returned messages should be strictly newer than the cursor message
    const cursorMsgIndex = msgIds.indexOf(olderPage.nextCursor!);
    for (const m of newerPage.messages) {
      expect(msgIds.indexOf(m.id)).toBeGreaterThan(cursorMsgIndex);
    }
  });

  test("getMessagesAround returns cursor metadata", async () => {
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `around-${testId()}` },
    });
    const chan = (await chanRes.json()) as { id: string };

    // Send 60 messages to ensure there are messages beyond the around window
    const msgIds: string[] = [];
    for (let i = 0; i < 60; i++) {
      const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: chan.id },
        json: { content: `around-msg-${String(i).padStart(3, "0")}` },
      });
      const msg = (await res.json()) as { id: string };
      msgIds.push(msg.id);
    }

    // Pick a message in the middle
    const targetId = msgIds[30]!;
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.around[":messageId"].$get({
      param: { slug, id: chan.id, messageId: targetId },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      messages: { id: string }[];
      targetFound: boolean;
      olderCursor: string | null;
      newerCursor: string | null;
      hasOlder: boolean;
      hasNewer: boolean;
    };
    expect(body.targetFound).toBe(true);
    expect(body.messages.length).toBeGreaterThan(0);
    expect(body.olderCursor).not.toBeNull();
    expect(body.newerCursor).not.toBeNull();
    expect(body.hasOlder).toBe(true);
    expect(body.hasNewer).toBe(true);

    // Target message should be included
    const targetFound = body.messages.find((m) => m.id === targetId);
    expect(targetFound).toBeDefined();
  });

  test("getMessagesAround with non-existent messageId → 404", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.around[":messageId"].$get({
      param: { slug, id: channelId, messageId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Message not found");
  });

  test("create message with invalid attachmentIds → 400", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `attach-test-${testId()}`, attachmentIds: ["00000000-0000-0000-0000-000000000000"] },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("One or more attachments are invalid or already linked");
  });

  test("create thread reply with invalid attachmentIds → 400", async () => {
    // Create a parent message first
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `parent-attach-${testId()}` },
    });
    expect(parentRes.status).toBe(201);
    const parent = (await parentRes.json()) as { id: string };

    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parent.id },
      json: { content: `reply-attach-${testId()}`, attachmentIds: ["00000000-0000-0000-0000-000000000000"] },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("One or more attachments are invalid or already linked");
  });
});
