import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  addToWorkspace,
  testId,
} from "./helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslack/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("direct messages", () => {
  let client: Client;
  let slug: string;
  const user1Id = "api-e2e-dm-user-001";

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: user1Id,
      displayName: "DM User 1",
      email: `dm-001-${testId()}@openslack.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  test("create self-DM → 201", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user1Id },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      channel: { id: string; type: string; name: string };
      otherUser: { id: string };
    };
    expect(body.channel.type).toBe("dm");
    expect(body.otherUser.id).toBe(user1Id);
  });

  test("get existing self-DM → 200 (idempotent)", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user1Id },
    });
    expect(res.status).toBe(200);
  });

  test("target not a workspace member → 400", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: "nonexistent-user-id" },
    });
    expect(res.status).toBe(400);
  });

  test("list DMs — returns created self-DM", async () => {
    const res = await client.api.workspaces[":slug"].dm.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    }[];
    expect(dms.length).toBeGreaterThanOrEqual(1);
    const selfDm = dms.find((d) => d.otherUser.id === user1Id);
    expect(selfDm).toBeDefined();
    expect(selfDm!.channel.type).toBe("dm");
  });

  test("list DMs when empty → empty array", async () => {
    const { client: freshClient } = await createTestClient({
      id: `dm-fresh-${testId()}`,
      displayName: "Fresh User",
      email: `dm-fresh-${testId()}@openslack.dev`,
    });
    const freshWs = await createTestWorkspace(freshClient);
    const res = await freshClient.api.workspaces[":slug"].dm.$get({
      param: { slug: freshWs.slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as unknown[];
    expect(dms.length).toBe(0);
  });

  test("send message in DM channel → 201 (reuses message routes)", async () => {
    const dmRes = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user1Id },
    });
    const { channel } = (await dmRes.json()) as {
      channel: { id: string };
    };

    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel.id },
      json: { content: `dm-msg-${testId()}` },
    });
    expect(msgRes.status).toBe(201);
  });

  test("DMs excluded from GET /channels response", async () => {
    const res = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { type: string }[];
    for (const ch of channels) {
      expect(ch.type).toBe("public");
    }
  });
});

describe("direct messages — cross-user", () => {
  let client: Client;
  let slug: string;
  const user1Id = `dm-cross-001-${testId()}`;
  const user2Id = `dm-cross-002-${testId()}`;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: user1Id,
      displayName: "Cross DM User 1",
      email: `cross-dm-001-${testId()}@openslack.dev`,
    });
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // User2 gets upserted as a user (but NOT added to user1's workspace)
    await createTestClient({
      id: user2Id,
      displayName: "Cross DM User 2",
      email: `cross-dm-002-${testId()}@openslack.dev`,
    });
  });

  test("DM with non-workspace-member → 400", async () => {
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: user2Id },
    });
    expect(res.status).toBe(400);
  });
});

describe("direct messages — cross-user (workspace members)", () => {
  let client1: Client;
  let client2: Client;
  let slug: string;
  const u1Id = `dm-xm-001-${testId()}`;
  const u2Id = `dm-xm-002-${testId()}`;

  beforeAll(async () => {
    const ctx1 = await createTestClient({
      id: u1Id,
      displayName: "XM DM User 1",
      email: `xm-dm-001-${testId()}@openslack.dev`,
    });
    client1 = ctx1.client;
    const workspace = await createTestWorkspace(client1);
    slug = workspace.slug;

    const ctx2 = await createTestClient({
      id: u2Id,
      displayName: "XM DM User 2",
      email: `xm-dm-002-${testId()}@openslack.dev`,
    });
    client2 = ctx2.client;
    await addToWorkspace(client1, slug, client2);
  });

  test("create DM between two workspace members → 201", async () => {
    const res = await client1.api.workspaces[":slug"].dm.$post({
      param: { slug },
      json: { userId: u2Id },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    };
    expect(body.channel.type).toBe("dm");
    expect(body.otherUser.id).toBe(u2Id);
  });

  test("list DMs includes cross-user DM", async () => {
    const res = await client1.api.workspaces[":slug"].dm.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    }[];
    expect(dms.length).toBeGreaterThanOrEqual(1);
    const crossDm = dms.find((d) => d.otherUser.id === u2Id);
    expect(crossDm).toBeDefined();
    expect(crossDm!.channel.type).toBe("dm");
  });

  test("other user also sees the DM in their list", async () => {
    const res = await client2.api.workspaces[":slug"].dm.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const dms = (await res.json()) as {
      channel: { id: string; type: string };
      otherUser: { id: string };
    }[];
    const crossDm = dms.find((d) => d.otherUser.id === u1Id);
    expect(crossDm).toBeDefined();
  });
});
