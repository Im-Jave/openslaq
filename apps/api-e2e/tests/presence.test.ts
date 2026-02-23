import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";
import {
  addSocket,
  removeSocket,
  getOnlineUserIds,
  persistLastSeen,
  getUserWorkspaceIds,
} from "../../api/src/presence/service";

describe("presence", () => {
  let client1: Awaited<ReturnType<typeof createTestClient>>["client"];
  let client2: Awaited<ReturnType<typeof createTestClient>>["client"];
  let user1Id: string;
  let user2Id: string;
  let slug: string;

  beforeAll(async () => {
    user1Id = `presence-user1-${testId()}`;
    user2Id = `presence-user2-${testId()}`;

    const ctx1 = await createTestClient({
      id: user1Id,
      displayName: "Presence User 1",
      email: `presence1-${testId()}@openslack.dev`,
    });
    client1 = ctx1.client;

    const ctx2 = await createTestClient({
      id: user2Id,
      displayName: "Presence User 2",
      email: `presence2-${testId()}@openslack.dev`,
    });
    client2 = ctx2.client;

    const workspace = await createTestWorkspace(client1);
    slug = workspace.slug;

    // User2 joins the workspace via invite
    const inviteRes = await client1.api.workspaces[":slug"].invites.$post({
      param: { slug },
      json: {},
    });
    const invite = (await inviteRes.json()) as { code: string };
    await client2.api.invites[":code"].accept.$post({
      param: { code: invite.code },
    });
  });

  test("GET /presence returns workspace members with presence fields", async () => {
    const res = await client1.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);

    for (const entry of data) {
      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("online");
      expect(entry).toHaveProperty("lastSeenAt");
    }
  });

  test("all members default to offline (no sockets connected)", async () => {
    const res = await client1.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    const data = (await res.json()) as Array<{
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }>;
    for (const entry of data) {
      expect(entry.online).toBe(false);
    }
  });

  test("lastSeen is empty for fresh users", async () => {
    const res = await client1.api.workspaces[":slug"].presence.$get({
      param: { slug },
    });
    const data = (await res.json()) as Array<{
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }>;
    for (const entry of data) {
      expect(entry.lastSeenAt).toBeFalsy();
    }
  });

  describe("presence service (in-process)", () => {
    beforeEach(() => {
      for (const socketId of ["sock-a", "sock-b", "sock-c", "sock-d", "sock-e", "sock-f"]) {
        removeSocket(user1Id, socketId);
      }
    });

    test("addSocket marks user as online, returns true on first connection", () => {
      const came = addSocket(user1Id, "sock-a");
      expect(came).toBe(true);
      expect(getOnlineUserIds().has(user1Id)).toBe(true);
    });

    test("addSocket returns false on second connection (already online)", () => {
      const first = addSocket(user1Id, "sock-a");
      expect(first).toBe(true);
      const came = addSocket(user1Id, "sock-b");
      expect(came).toBe(false);
      expect(getOnlineUserIds().has(user1Id)).toBe(true);
    });

    test("removeSocket returns false when other sockets remain", () => {
      addSocket(user1Id, "sock-a");
      addSocket(user1Id, "sock-b");
      const went = removeSocket(user1Id, "sock-a");
      expect(went).toBe(false);
      expect(getOnlineUserIds().has(user1Id)).toBe(true);
    });

    test("removeSocket returns true when last socket disconnects", () => {
      addSocket(user1Id, "sock-a");
      const went = removeSocket(user1Id, "sock-b");
      expect(went).toBe(false);
      const finalWent = removeSocket(user1Id, "sock-a");
      expect(finalWent).toBe(true);
      expect(getOnlineUserIds().has(user1Id)).toBe(false);
    });

    test("removeSocket returns true when last tracked socket disconnects", () => {
      addSocket(user1Id, "sock-c");
      const went = removeSocket(user1Id, "sock-c");
      expect(went).toBe(true);
      expect(getOnlineUserIds().has(user1Id)).toBe(false);
    });

    test("removeSocket returns false for unknown user", () => {
      const went = removeSocket("nonexistent-user", "sock-x");
      expect(went).toBe(false);
    });

    test("addSocket makes user visible in GET /presence", async () => {
      addSocket(user1Id, "sock-d");

      const res = await client1.api.workspaces[":slug"].presence.$get({
        param: { slug },
      });
      const data = (await res.json()) as Array<{
        userId: string;
        online: boolean;
        lastSeenAt: string | null;
      }>;
      const entry = data.find((e) => e.userId === user1Id);
      expect(entry?.online).toBe(true);

      // user2 should still be offline
      const entry2 = data.find((e) => e.userId === user2Id);
      expect(entry2?.online).toBe(false);
    });

    test("persistLastSeen writes timestamp to DB", async () => {
      addSocket(user1Id, "sock-e");
      await persistLastSeen(user1Id);

      // Clean up socket so user appears offline
      removeSocket(user1Id, "sock-e");

      const res = await client1.api.workspaces[":slug"].presence.$get({
        param: { slug },
      });
      const data = (await res.json()) as Array<{
        userId: string;
        online: boolean;
        lastSeenAt: string | null;
      }>;
      const entry = data.find((e) => e.userId === user1Id);
      expect(entry?.online).toBe(false);
      expect(entry?.lastSeenAt).toBeTruthy();
    });

    test("getUserWorkspaceIds returns workspace IDs for a member", async () => {
      const ids = await getUserWorkspaceIds(user1Id);
      expect(ids.length).toBeGreaterThanOrEqual(1);
    });
  });
});
