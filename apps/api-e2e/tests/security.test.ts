import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("security", () => {
  let ownerClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let ownerHeaders: Record<string, string>;
  let memberClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;
  let messageId: string;

  beforeAll(async () => {
    const owner = await createTestClient({ id: `sec-owner-${testId()}`, email: `sec-owner-${testId()}@test.dev` });
    ownerClient = owner.client;
    ownerHeaders = owner.headers;

    const member = await createTestClient({ id: `sec-member-${testId()}`, email: `sec-member-${testId()}@test.dev` });
    memberClient = member.client;

    const workspace = await createTestWorkspace(ownerClient);
    slug = workspace.slug;

    // Add member to workspace
    await addToWorkspace(ownerClient, slug, memberClient);

    // Create a private channel with only the owner
    const chRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sec-private-${testId()}`, type: "private" },
    });
    expect(chRes.status).toBe(201);
    const channel = (await chRes.json()) as { id: string };
    channelId = channel.id;

    // Owner sends a message
    const msgRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `secret message ${testId()}` },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };
    messageId = msg.id;
  });

  // Fix #3: Non-member cannot edit messages in a private channel
  test("non-member cannot edit message in private channel", async () => {
    const res = await memberClient.api.messages[":id"].$put({
      param: { id: messageId },
      json: { content: "hacked!" },
    });
    // Should be 404 (message not found for non-member) not 200/403
    expect(res.status).toBe(404);
  });

  // Fix #3: Non-member cannot delete messages in a private channel
  test("non-member cannot delete message in private channel", async () => {
    const res = await memberClient.api.messages[":id"].$delete({
      param: { id: messageId },
    });
    expect(res.status).toBe(404);
  });

  // Fix #3: Non-member can still read their own messages if they're also the author
  // (this tests that the middleware is on the right routes - GET already had it)
  test("non-member cannot get message in private channel", async () => {
    const res = await memberClient.api.messages[":id"].$get({
      param: { id: messageId },
    });
    expect(res.status).toBe(404);
  });

  // Fix #12: Display name length limit
  test("display name cannot exceed 100 chars", async () => {
    const longName = "A".repeat(101);
    // Use raw fetch since the typed client doesn't include 400 in its return type
    const baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: "PATCH",
      headers: { ...ownerHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: longName }),
    });
    expect(res.status).toBe(400);
  });

  test("display name of 100 chars is accepted", async () => {
    const validName = "B".repeat(100);
    const res = await ownerClient.api.users.me.$patch({
      json: { displayName: validName },
    });
    expect(res.status).toBe(200);
  });
});
