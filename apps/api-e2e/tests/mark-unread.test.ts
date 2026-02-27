import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("mark as unread", () => {
  let ownerClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let otherClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const owner = await createTestClient({
      id: `unread-owner-${testId()}`,
      email: `unread-owner-${testId()}@openslaq.dev`,
      displayName: "Unread Owner",
    });
    ownerClient = owner.client;

    const other = await createTestClient({
      id: `unread-other-${testId()}`,
      email: `unread-other-${testId()}@openslaq.dev`,
      displayName: "Unread Other",
    });
    otherClient = other.client;

    const workspace = await createTestWorkspace(ownerClient);
    slug = workspace.slug;

    await addToWorkspace(ownerClient, slug, otherClient);

    const res = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `unread-${testId()}` },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;

    // Other user joins the channel
    await otherClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
  });

  test("mark as unread sets correct read position and returns count", async () => {
    // Send 3 messages
    const messages: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug, id: channelId },
        json: { content: `msg-${i}-${testId()}` },
      });
      const msg = (await res.json()) as { id: string };
      messages.push(msg.id);
    }

    // Mark as read first
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });

    // Mark the second message as unread
    const res = await otherClient.api.workspaces[":slug"].channels[":id"]["mark-unread"].$post({
      param: { slug, id: channelId },
      json: { messageId: messages[1]! },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; unreadCount: number };
    expect(body.ok).toBe(true);
    // Messages[1] and messages[2] should be unread (2 messages)
    expect(body.unreadCount).toBe(2);
  });

  test("own message can be marked as unread", async () => {
    const sendRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `own-msg-${testId()}` },
    });
    const msg = (await sendRes.json()) as { id: string };

    const res = await ownerClient.api.workspaces[":slug"].channels[":id"]["mark-unread"].$post({
      param: { slug, id: channelId },
      json: { messageId: msg.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; unreadCount: number };
    expect(body.ok).toBe(true);
    expect(body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  test("404 for nonexistent message", async () => {
    const res = await ownerClient.api.workspaces[":slug"].channels[":id"]["mark-unread"].$post({
      param: { slug, id: channelId },
      json: { messageId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });

  test("404 for message in wrong channel", async () => {
    // Create a message in the test channel
    const sendRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `wrong-channel-${testId()}` },
    });
    const msg = (await sendRes.json()) as { id: string };

    // Create another channel
    const chanRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `other-${testId()}` },
    });
    const otherChannel = (await chanRes.json()) as { id: string };

    // Try to mark the message as unread in the wrong channel
    const res = await ownerClient.api.workspaces[":slug"].channels[":id"]["mark-unread"].$post({
      param: { slug, id: otherChannel.id },
      json: { messageId: msg.id },
    });
    expect(res.status).toBe(404);
  });
});
