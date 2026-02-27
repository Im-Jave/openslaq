import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("all unreads", () => {
  let ownerClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let otherClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId1: string;
  let channelId2: string;
  let _ownerId: string;
  let otherId: string;

  beforeAll(async () => {
    const owner = await createTestClient({
      id: `unreads-owner-${testId()}`,
      email: `unreads-owner-${testId()}@openslaq.dev`,
      displayName: "Unreads Owner",
    });
    ownerClient = owner.client;
    _ownerId = owner.user.id;

    const other = await createTestClient({
      id: `unreads-other-${testId()}`,
      email: `unreads-other-${testId()}@openslaq.dev`,
      displayName: "Unreads Other",
    });
    otherClient = other.client;
    otherId = other.user.id;

    const workspace = await createTestWorkspace(ownerClient);
    slug = workspace.slug;

    await addToWorkspace(ownerClient, slug, otherClient);

    // Create channel 1
    const res1 = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `unreads-ch1-${testId()}` },
    });
    channelId1 = ((await res1.json()) as { id: string }).id;

    // Create channel 2
    const res2 = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `unreads-ch2-${testId()}` },
    });
    channelId2 = ((await res2.json()) as { id: string }).id;

    // Other user joins both channels
    await otherClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId1 },
    });
    await otherClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId2 },
    });

    // Mark both channels as read for "other" user
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId2 },
    });
  });

  test("returns empty when all channels are read", async () => {
    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { channels: unknown[]; threadMentions: unknown[] };
    expect(body.channels).toHaveLength(0);
    expect(body.threadMentions).toHaveLength(0);
  });

  test("returns unread top-level messages grouped by channel", async () => {
    // Owner sends messages in both channels
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `ch1-msg-${testId()}` },
    });
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId2 },
      json: { content: `ch2-msg-${testId()}` },
    });

    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      channels: Array<{ channelId: string; messages: Array<{ content: string }> }>;
      threadMentions: unknown[];
    };

    expect(body.channels.length).toBeGreaterThanOrEqual(2);

    const ch1Group = body.channels.find((g) => g.channelId === channelId1);
    const ch2Group = body.channels.find((g) => g.channelId === channelId2);
    expect(ch1Group).toBeDefined();
    expect(ch2Group).toBeDefined();
    expect(ch1Group!.messages.length).toBeGreaterThanOrEqual(1);
    expect(ch2Group!.messages.length).toBeGreaterThanOrEqual(1);
  });

  test("excludes own messages", async () => {
    // Mark channel 1 as read for "other"
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });

    // Other user sends a message themselves
    await otherClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `own-msg-${testId()}` },
    });

    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const body = (await res.json()) as {
      channels: Array<{ channelId: string; messages: Array<{ userId: string }> }>;
    };

    const ch1Group = body.channels.find((g) => g.channelId === channelId1);
    // Should not contain own message
    if (ch1Group) {
      for (const msg of ch1Group.messages) {
        expect(msg.userId).not.toBe(otherId);
      }
    }
  });

  test("excludes muted channels", async () => {
    // Mark both channels as read first
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId2 },
    });

    // Mute channel 1 for other user
    await otherClient.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId1 },
      json: { level: "muted" },
    });

    // Owner sends messages in both channels
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `muted-msg-${testId()}` },
    });
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId2 },
      json: { content: `unmuted-msg-${testId()}` },
    });

    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const body = (await res.json()) as {
      channels: Array<{ channelId: string }>;
    };

    // Channel 1 should not appear (muted)
    const ch1Group = body.channels.find((g) => g.channelId === channelId1);
    expect(ch1Group).toBeUndefined();

    // Channel 2 should appear
    const ch2Group = body.channels.find((g) => g.channelId === channelId2);
    expect(ch2Group).toBeDefined();

    // Unmute channel 1 for cleanup
    await otherClient.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
      param: { slug, id: channelId1 },
      json: { level: "all" },
    });
  });

  test("includes thread replies that @mention the user", async () => {
    // Mark channels as read
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId2 },
    });

    // Owner sends a top-level message
    const parentRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `thread-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Owner sends a thread reply mentioning "other"
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId1, messageId: parent.id },
      json: { content: `Hey <@${otherId}> check this` },
    });

    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const body = (await res.json()) as {
      channels: Array<{ channelId: string }>;
      threadMentions: Array<{ content: string; parentMessageId: string | null }>;
    };

    // Thread mention should appear
    expect(body.threadMentions.length).toBeGreaterThanOrEqual(1);
    const mention = body.threadMentions.find((m) => m.parentMessageId === parent.id);
    expect(mention).toBeDefined();
  });

  test("does not include non-mentioning thread replies", async () => {
    // Mark channels as read
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId2 },
    });

    // Owner sends a top-level message
    const parentRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `no-mention-parent-${testId()}` },
    });
    const parent = (await parentRes.json()) as { id: string };

    // Owner sends a thread reply NOT mentioning "other"
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channelId1, messageId: parent.id },
      json: { content: `Just a regular reply ${testId()}` },
    });

    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const body = (await res.json()) as {
      threadMentions: Array<{ parentMessageId: string | null }>;
    };

    // Should NOT contain a thread mention for this parent
    const mention = body.threadMentions.find((m) => m.parentMessageId === parent.id);
    expect(mention).toBeUndefined();
  });

  test("mark-all-read clears all unreads", async () => {
    // Mark channels as read first
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId2 },
    });

    // Owner sends messages in both channels
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `before-mark-all-1-${testId()}` },
    });
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId2 },
      json: { content: `before-mark-all-2-${testId()}` },
    });

    // Verify there are unreads
    const beforeRes = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const beforeBody = (await beforeRes.json()) as { channels: unknown[] };
    expect(beforeBody.channels.length).toBeGreaterThanOrEqual(2);

    // Mark all as read
    const markRes = await otherClient.api.workspaces[":slug"].unreads["mark-all-read"].$post({
      param: { slug },
    });
    expect(markRes.status).toBe(200);
    const markBody = (await markRes.json()) as { ok: boolean };
    expect(markBody.ok).toBe(true);

    // Verify unreads are cleared
    const afterRes = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const afterBody = (await afterRes.json()) as { channels: unknown[]; threadMentions: unknown[] };
    expect(afterBody.channels).toHaveLength(0);
    expect(afterBody.threadMentions).toHaveLength(0);
  });

  test("respects per-channel read positions", async () => {
    // Mark channel 1 as read, but NOT channel 2
    await otherClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId1 },
    });

    // Owner sends messages in channel 1 only
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `read-pos-1-${testId()}` },
    });
    await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId1 },
      json: { content: `read-pos-2-${testId()}` },
    });

    const res = await otherClient.api.workspaces[":slug"].unreads.$get({
      param: { slug },
    });
    const body = (await res.json()) as {
      channels: Array<{ channelId: string; messages: unknown[] }>;
    };

    const ch1Group = body.channels.find((g) => g.channelId === channelId1);
    expect(ch1Group).toBeDefined();
    expect(ch1Group!.messages.length).toBeGreaterThanOrEqual(2);
  });
});
