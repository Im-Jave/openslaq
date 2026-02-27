import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import { addSocket, removeSocket } from "../../api/src/presence/service";

describe("mentions", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let client2: Awaited<ReturnType<typeof createTestClient>>["client"];
  let user2Id: string;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create second user and add to workspace
    const uid = testId();
    const ctx2 = await createTestClient({
      id: `mention-user-${uid}`,
      displayName: "Mention Target",
      email: `mention-target-${uid}@openslaq.dev`,
    });
    client2 = ctx2.client;
    user2Id = ctx2.user.id;
    await addToWorkspace(client, slug, client2);

    // Create a channel and have both users join
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `mention-test-${testId()}` },
    });
    const channel = (await chanRes.json()) as unknown as { id: string };
    channelId = channel.id;

    await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
  });

  test("message with @user mention stores mention", async () => {
    const content = `Hello <@${user2Id}> check this out`;
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(res.status).toBe(201);
    const msg = (await res.json()) as unknown as {
      id: string;
      content: string;
      mentions: Array<{ userId: string; displayName: string; type: string }>;
    };
    expect(msg.content).toBe(content);
    expect(msg.mentions).toBeArray();
    expect(msg.mentions.length).toBe(1);
    expect(msg.mentions[0]!.userId).toBe(user2Id);
    expect(msg.mentions[0]!.type).toBe("user");
    expect(msg.mentions[0]!.displayName).toBe("Mention Target");
  });

  test("message with @channel expands to all members (minus sender)", async () => {
    const content = "Attention <@channel> important update";
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(res.status).toBe(201);
    const msg = (await res.json()) as unknown as {
      mentions: Array<{ userId: string; type: string }>;
    };
    // Should mention user2 (not sender)
    expect(msg.mentions.length).toBeGreaterThanOrEqual(1);
    const user2Mention = msg.mentions.find((m) => m.userId === user2Id);
    expect(user2Mention).toBeDefined();
    expect(user2Mention!.type).toBe("channel");
  });

  test("message with @here only mentions online members", async () => {
    const socketId = `mentions-here-${testId()}`;
    addSocket(user2Id, socketId);
    try {
      const content = "Ping <@here> for immediate attention";
      const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: channelId },
        json: { content },
      });
      expect(res.status).toBe(201);
      const msg = (await res.json()) as unknown as {
        mentions: Array<{ userId: string; type: string }>;
      };

      const user2Mention = msg.mentions.find((m) => m.userId === user2Id);
      expect(user2Mention).toBeDefined();
      expect(user2Mention!.type).toBe("here");
    } finally {
      removeSocket(user2Id, socketId);
    }
  });

  test("editing message updates mentions", async () => {
    // Create message without mentions
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "no mentions yet" },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as unknown as { id: string; mentions: Array<{ userId: string }> };
    expect(created.mentions.length).toBe(0);

    // Edit to add a mention
    const editRes = await client.api.messages[":id"].$put({
      param: { id: created.id },
      json: { content: `now mentioning <@${user2Id}>` },
    });
    expect(editRes.status).toBe(200);
    const edited = (await editRes.json()) as unknown as { mentions: Array<{ userId: string; type: string }> };
    expect(edited.mentions.length).toBe(1);
    expect(edited.mentions[0]!.userId).toBe(user2Id);
  });

  test("editing message to remove mentions clears them", async () => {
    // Create message with mention
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `hey <@${user2Id}>` },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as unknown as { id: string; mentions: Array<{ userId: string }> };
    expect(created.mentions.length).toBe(1);

    // Edit to remove mention
    const editRes = await client.api.messages[":id"].$put({
      param: { id: created.id },
      json: { content: "no more mentions" },
    });
    expect(editRes.status).toBe(200);
    const edited = (await editRes.json()) as unknown as { mentions: Array<{ userId: string }> };
    expect(edited.mentions.length).toBe(0);
  });

  test("invalid @mention (nonexistent user) is ignored gracefully", async () => {
    const content = "hello <@nonexistent-user-id-12345>";
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(res.status).toBe(201);
    const msg = (await res.json()) as unknown as { mentions: Array<{ userId: string }> };
    expect(msg.mentions.length).toBe(0);
  });

  test("thread reply with mention stores mention", async () => {
    // Create parent message
    const parentRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "parent message" },
    });
    expect(parentRes.status).toBe(201);
    const parent = (await parentRes.json()) as unknown as { id: string };

    // Reply with mention
    const replyRes = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId, messageId: parent.id },
      json: { content: `<@${user2Id}> take a look at this thread` },
    });
    expect(replyRes.status).toBe(201);
    const reply = (await replyRes.json()) as unknown as {
      mentions: Array<{ userId: string; type: string }>;
    };
    expect(reply.mentions.length).toBe(1);
    expect(reply.mentions[0]!.userId).toBe(user2Id);
    expect(reply.mentions[0]!.type).toBe("user");
  });

  test("mentions are included when listing messages", async () => {
    const content = `list-check <@${user2Id}>`;
    const createRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as unknown as { id: string };

    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as unknown as { messages: Array<{ id: string; mentions: Array<{ userId: string }> }> };
    const found = body.messages.find((m) => m.id === created.id);
    expect(found).toBeDefined();
    expect(found!.mentions.length).toBe(1);
    expect(found!.mentions[0]!.userId).toBe(user2Id);
  });

  test("workspace members ?q= filter", async () => {
    const allRes = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
      query: {},
    });
    expect(allRes.status).toBe(200);
    const allMembers = (await allRes.json()) as unknown as Array<{ id: string; displayName: string }>;
    expect(allMembers.length).toBeGreaterThanOrEqual(2);

    // Filter by name
    const filterRes = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
      query: { q: "Mention" },
    });
    expect(filterRes.status).toBe(200);
    const filtered = (await filterRes.json()) as unknown as Array<{ id: string; displayName: string }>;
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.some((m) => m.id === user2Id)).toBe(true);
  });
});
