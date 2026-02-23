import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("reactions", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;
  let messageId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create a test channel
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `react-test-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };
    channelId = channel.id;

    // Create a test message
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `react-msg-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };
    messageId = msg.id;
  });

  test("add reaction → 200, returns reactions array with count 1", async () => {
    const res = await client.api.messages[":id"].reactions.$post({
      param: { id: messageId },
      json: { emoji: "👍" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reactions: { emoji: string; count: number; userIds: string[] }[];
    };
    expect(body.reactions).toHaveLength(1);
    expect(body.reactions[0]!.emoji).toBe("👍");
    expect(body.reactions[0]!.count).toBe(1);
  });

  test("toggle same reaction again → removes it", async () => {
    // First, add the reaction
    await client.api.messages[":id"].reactions.$post({
      param: { id: messageId },
      json: { emoji: "🔥" },
    });

    // Toggle it off
    const res = await client.api.messages[":id"].reactions.$post({
      param: { id: messageId },
      json: { emoji: "🔥" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reactions: { emoji: string; count: number; userIds: string[] }[];
    };
    const fireReaction = body.reactions.find((r) => r.emoji === "🔥");
    expect(fireReaction).toBeUndefined();
  });

  test("multiple emojis on same message", async () => {
    // Create a fresh message
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `multi-emoji-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "👍" },
    });
    const res = await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "❤️" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reactions: { emoji: string; count: number }[];
    };
    expect(body.reactions).toHaveLength(2);
    const emojis = body.reactions.map((r) => r.emoji).sort();
    expect(emojis).toEqual(["❤️", "👍"].sort());
  });

  test("two users react with same emoji → count 2", async () => {
    // Create a fresh message
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `two-users-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    // User 1 reacts
    await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "👍" },
    });

    // User 2 joins workspace and channel, then reacts with same emoji
    const { client: client2 } = await createTestClient({
      id: "api-e2e-react-user-002",
      displayName: "Reaction User 2",
      email: "api-e2e-react-002@openslack.dev",
    });
    await addToWorkspace(client, slug, client2);
    await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    const res = await client2.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "👍" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reactions: { emoji: string; count: number; userIds: string[] }[];
    };
    expect(body.reactions).toHaveLength(1);
    expect(body.reactions[0]!.count).toBe(2);
    expect(body.reactions[0]!.userIds).toHaveLength(2);
  });

  test("reactions included in message list GET response", async () => {
    // Create a fresh message and add a reaction
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `list-reactions-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "🎉" },
    });

    // Fetch messages list
    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as {
      messages: { id: string; reactions: { emoji: string; count: number }[] }[];
    };
    const found = body.messages.find((m) => m.id === msg.id);
    expect(found).toBeDefined();
    expect(found!.reactions).toHaveLength(1);
    expect(found!.reactions[0]!.emoji).toBe("🎉");
  });

  test("reactions included in single message GET response", async () => {
    // Create a fresh message and add a reaction
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `single-reactions-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    await client.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "✅" },
    });

    // Fetch single message
    const getRes = await client.api.messages[":id"].$get({
      param: { id: msg.id },
    });
    expect(getRes.status).toBe(200);
    const message = (await getRes.json()) as {
      reactions: { emoji: string; count: number }[];
    };
    expect(message.reactions).toHaveLength(1);
    expect(message.reactions[0]!.emoji).toBe("✅");
  });

  test("toggle on nonexistent message → 404", async () => {
    const res = await client.api.messages[":id"].reactions.$post({
      param: { id: "00000000-0000-0000-0000-000000000000" },
      json: { emoji: "👍" },
    });
    expect(res.status).toBe(404);
  });
});
