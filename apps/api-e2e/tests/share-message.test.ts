import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("share message", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let sourceChannelId: string;
  let destChannelId: string;
  let messageId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;

    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Create source channel
    const srcRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `share-src-${testId()}` },
    });
    const srcChannel = (await srcRes.json()) as { id: string };
    sourceChannelId = srcChannel.id;

    // Create destination channel
    const destRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `share-dest-${testId()}` },
    });
    const destChannel = (await destRes.json()) as { id: string };
    destChannelId = destChannel.id;

    // Send a message in source channel
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: sourceChannelId },
      json: { content: "This message will be shared" },
    });
    const msg = (await msgRes.json()) as { id: string };
    messageId = msg.id;
  });

  test("share message to another channel → 201", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug, id: destChannelId },
      json: { sharedMessageId: messageId, comment: "Check this out!" },
    });
    expect(res.status).toBe(201);

    const data = (await res.json()) as {
      id: string;
      channelId: string;
      content: string;
      sharedMessage: {
        id: string;
        channelId: string;
        channelName: string;
        senderDisplayName: string;
        content: string;
      };
    };
    expect(data.channelId).toBe(destChannelId);
    expect(data.content).toBe("Check this out!");
    expect(data.sharedMessage).toBeDefined();
    expect(data.sharedMessage.id).toBe(messageId);
    expect(data.sharedMessage.channelId).toBe(sourceChannelId);
    expect(data.sharedMessage.content).toBe("This message will be shared");
    expect(data.sharedMessage.senderDisplayName).toBeDefined();
    expect(data.sharedMessage.channelName).toBeDefined();
  });

  test("shared message appears in destination channel messages", async () => {
    // Share first
    await client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug, id: destChannelId },
      json: { sharedMessageId: messageId, comment: "Listing test" },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: destChannelId },
      query: {},
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      messages: Array<{
        sharedMessage?: {
          id: string;
          content: string;
        };
      }>;
    };
    const shared = data.messages.find((m) => m.sharedMessage?.id === messageId);
    expect(shared).toBeDefined();
    expect(shared!.sharedMessage!.content).toBe("This message will be shared");
  });

  test("share with empty comment → 201", async () => {
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug, id: destChannelId },
      json: { sharedMessageId: messageId, comment: "" },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { content: string };
    expect(data.content).toBe("");
  });

  test("share non-existent message → 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug, id: destChannelId },
      json: { sharedMessageId: fakeId, comment: "" },
    });
    expect(res.status).toBe(404);
  });

  test("share to archived channel → 403", async () => {
    // Create and archive a channel
    const archRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `share-arch-${testId()}` },
    });
    const archChannel = (await archRes.json()) as { id: string };
    await client.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: archChannel.id },
    });

    const res = await client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug, id: archChannel.id },
      json: { sharedMessageId: messageId, comment: "" },
    });
    expect(res.status).toBe(403);
  });

  test("share from channel user is not a member of → 403", async () => {
    // Create a second user who is not a member of the source channel
    const ctx2 = await createTestClient({
      id: `share-nonmember-${testId()}`,
      displayName: "Non-Member Sharer",
      email: `share-nonmember-${testId()}@openslaq.dev`,
      emailVerified: true,
    });

    // Create source channel owned by user1
    const srcRes2 = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `share-priv-src-${testId()}`, type: "private" },
    });
    const srcChannel2 = (await srcRes2.json()) as { id: string };

    // Send a message in the private channel
    const msgRes2 = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: srcChannel2.id },
      json: { content: "Private message" },
    });
    const msg2 = (await msgRes2.json()) as { id: string };

    // User2 creates a dest channel in the same workspace
    // First, user2 needs to join the workspace - let's create an invite
    const invRes = await client.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: {},
    });
    const invite = (await invRes.json()) as { code: string };

    await ctx2.client.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });

    // User2 creates a channel in the workspace
    const destRes2 = await ctx2.client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `share-priv-dest-${testId()}` },
    });
    const destChannel2 = (await destRes2.json()) as { id: string };

    // User2 tries to share a message from the private channel they're not a member of
    // The source message is in a private channel; user2 shouldn't even see it via getMessageById
    // but the endpoint checks membership explicitly
    const shareRes = await ctx2.client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug, id: destChannel2.id },
      json: { sharedMessageId: msg2.id, comment: "" },
    });
    // Should be 403 (not member of source) or 404 (can't find private channel message)
    expect([403, 404]).toContain(shareRes.status);
  });
});
