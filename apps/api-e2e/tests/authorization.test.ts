import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslack/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("authorization — workspace membership enforcement", () => {
  let ownerClient: Client;
  let nonMemberClient: Client;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `auth-owner-${testId()}`,
      email: `auth-owner-${testId()}@openslack.dev`,
    });
    ownerClient = ctx.client;

    const ws = await createTestWorkspace(ownerClient);
    slug = ws.slug;

    // Create a channel in the workspace
    const chanRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `auth-chan-${testId()}` },
    });
    const channel = (await chanRes.json()) as { id: string };
    channelId = channel.id;

    // Create a non-member user (authenticated but not in workspace)
    const ctx2 = await createTestClient({
      id: `auth-outsider-${testId()}`,
      email: `auth-outsider-${testId()}@openslack.dev`,
    });
    nonMemberClient = ctx2.client;
  });

  test("non-member cannot list channels → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot create a channel → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `hacker-chan-${testId()}` },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot join a channel → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot read messages → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot send messages → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "unauthorized message" },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot list presence → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot get unread counts → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-member cannot search → 403", async () => {
    const res = await nonMemberClient.api.workspaces[":slug"].search.$get({
      param: { slug },
      query: { q: "test" },
    });
    expect(res.status as number).toBe(403);
  });
});

describe("authorization — channel-workspace verification", () => {
  test("channel from workspace B accessed via workspace A's URL → 404", async () => {
    const uid = testId();

    // Create workspace A
    const { client: clientA } = await createTestClient({
      id: `cross-ws-a-${uid}`,
      email: `cross-ws-a-${uid}@openslack.dev`,
    });
    const wsA = await createTestWorkspace(clientA);

    // Create workspace B with a channel
    const { client: clientB } = await createTestClient({
      id: `cross-ws-b-${uid}`,
      email: `cross-ws-b-${uid}@openslack.dev`,
    });
    const wsB = await createTestWorkspace(clientB);
    const chanRes = await clientB.api.workspaces[":slug"].channels.$post({
      param: { slug: wsB.slug },
      json: { name: `cross-chan-${uid}` },
    });
    const channelB = (await chanRes.json()) as { id: string };

    // Try to access workspace B's channel via workspace A's URL
    const res = await clientA.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug: wsA.slug, id: channelB.id },
    });
    expect(res.status as number).toBe(404);
  });
});

describe("authorization — channel membership enforcement", () => {
  let ownerClient: Client;
  let memberClient: Client;
  let slug: string;
  let channelId: string;
  let messageId: string;

  beforeAll(async () => {
    const uid = testId();

    // Owner creates workspace and channel
    const ctx = await createTestClient({
      id: `chan-auth-owner-${uid}`,
      email: `chan-auth-owner-${uid}@openslack.dev`,
    });
    ownerClient = ctx.client;

    const ws = await createTestWorkspace(ownerClient);
    slug = ws.slug;

    const chanRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `chan-auth-${uid}` },
    });
    const channel = (await chanRes.json()) as { id: string };
    channelId = channel.id;

    // Send a message (owner is channel member)
    const msgRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `auth-test-msg-${uid}` },
    });
    const msg = (await msgRes.json()) as { id: string };
    messageId = msg.id;

    // Member joins workspace but NOT the channel
    const ctx2 = await createTestClient({
      id: `chan-auth-member-${uid}`,
      email: `chan-auth-member-${uid}@openslack.dev`,
    });
    memberClient = ctx2.client;
    await addToWorkspace(ownerClient, slug, memberClient);
  });

  test("workspace member (not channel member) cannot read messages → 403", async () => {
    const res = await memberClient.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(res.status as number).toBe(403);
  });

  test("workspace member (not channel member) cannot send messages → 403", async () => {
    const res = await memberClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "unauthorized" },
    });
    expect(res.status as number).toBe(403);
  });

  test("workspace member (not channel member) cannot mark channel as read → 403", async () => {
    const res = await memberClient.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug, id: channelId },
    });
    expect(res.status as number).toBe(403);
  });

  test("workspace member (not channel member) cannot leave channel → 403", async () => {
    const res = await memberClient.api.workspaces[":slug"].channels[":id"].leave.$post({
      param: { slug, id: channelId },
    });
    expect(res.status as number).toBe(403);
  });

  test("non-channel-member cannot react to message → 404", async () => {
    const res = await memberClient.api.messages[":id"].reactions.$post({
      param: { id: messageId },
      json: { emoji: "👍" },
    });
    expect(res.status).toBe(404);
  });

  test("non-channel-member cannot GET message by ID → 404", async () => {
    const res = await memberClient.api.messages[":id"].$get({
      param: { id: messageId },
    });
    expect(res.status).toBe(404);
  });
});

describe("authorization — positive tests", () => {
  let ownerClient: Client;
  let memberClient: Client;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const uid = testId();

    const ctx = await createTestClient({
      id: `pos-owner-${uid}`,
      email: `pos-owner-${uid}@openslack.dev`,
    });
    ownerClient = ctx.client;

    const ws = await createTestWorkspace(ownerClient);
    slug = ws.slug;

    const chanRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `pos-chan-${uid}` },
    });
    const channel = (await chanRes.json()) as { id: string };
    channelId = channel.id;

    // Member joins workspace
    const ctx2 = await createTestClient({
      id: `pos-member-${uid}`,
      email: `pos-member-${uid}@openslack.dev`,
    });
    memberClient = ctx2.client;
    await addToWorkspace(ownerClient, slug, memberClient);
  });

  test("workspace member CAN list channels", async () => {
    const res = await memberClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
  });

  test("workspace member CAN join a public channel", async () => {
    const res = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(res.status).toBe(200);
  });

  test("channel member CAN read messages", async () => {
    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    const res = await memberClient.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(res.status).toBe(200);
  });

  test("channel member CAN send messages", async () => {
    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    const res = await memberClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `pos-msg-${testId()}` },
    });
    expect(res.status).toBe(201);
  });

  test("channel member CAN react to messages", async () => {
    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    // Send a message first
    const msgRes = await memberClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `react-pos-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    const res = await memberClient.api.messages[":id"].reactions.$post({
      param: { id: msg.id },
      json: { emoji: "👍" },
    });
    expect(res.status).toBe(200);
  });

  test("channel member CAN get message by ID", async () => {
    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channelId },
    });
    expect(joinRes.status).toBe(200);

    const msgRes = await memberClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `get-pos-${testId()}` },
    });
    const msg = (await msgRes.json()) as { id: string };

    const res = await memberClient.api.messages[":id"].$get({
      param: { id: msg.id },
    });
    expect(res.status).toBe(200);
  });
});
