import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import { addSocket, removeSocket } from "../../api/src/presence/service";
import { getIO } from "../../api/src/socket/io";

describe("channel members", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  test("memberCount is included in channel list", async () => {
    const res = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const channels = (await res.json()) as { id: string; name: string; memberCount: number }[];
    expect(channels.length).toBeGreaterThanOrEqual(1);
    const general = channels.find((ch) => ch.name === "general");
    expect(general).toBeDefined();
    expect(general!.memberCount).toBeGreaterThanOrEqual(1);
  });

  test("GET members returns member details", async () => {
    // Get the #general channel
    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string; name: string }[];
    const general = channels.find((ch) => ch.name === "general")!;

    const res = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: general.id },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { id: string; displayName: string; email: string; avatarUrl: string | null; joinedAt: string }[];
    expect(members.length).toBeGreaterThanOrEqual(1);
    const member = members[0]!;
    expect(member.id).toBeDefined();
    expect(member.displayName).toBeDefined();
    expect(member.email).toBeDefined();
    expect(typeof member.joinedAt).toBe("string");
  });

  test("second user appears in member list after joining", async () => {
    // Create a channel
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `members-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    // Add second user to workspace and channel
    const { client: client2 } = await createTestClient({
      id: "api-e2e-member-002",
      displayName: "Member Two",
      email: "member-002@openslaq.dev",
    });
    await addToWorkspace(client, slug, client2);
    await client2.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });

    // Fetch members
    const res = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { id: string }[];
    expect(members.length).toBe(2);
    expect(members.some((m) => m.id === "api-e2e-member-002")).toBe(true);
  });

  test("non-member gets 403 on channel members", async () => {
    // Create a channel (only creator is a member)
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `private-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    // Second user is in workspace but not in this channel
    const { client: client3 } = await createTestClient({
      id: "api-e2e-member-003",
      displayName: "Member Three",
      email: "member-003@openslaq.dev",
    });
    await addToWorkspace(client, slug, client3);

    const res = await client3.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    expect(res.status as number).toBe(403);
  });

  test("add member to public channel via API", async () => {
    // Create a public channel
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `add-pub-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    // Create a second user and add to workspace
    const { client: client5, user: user5 } = await createTestClient({
      id: `api-e2e-member-005-${testId()}`,
      displayName: "Member Five",
      email: `member-005-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(client, slug, client5);

    // Add second user to public channel via POST members endpoint
    const addRes = await client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: user5.id },
    });
    expect(addRes.status).toBe(201);

    // Verify the user is in the member list
    const membersRes = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    const members = (await membersRes.json()) as { id: string }[];
    expect(members.some((m) => m.id === user5.id)).toBe(true);
  });

  test("remove member from public channel via API", async () => {
    // Create a public channel
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `rm-pub-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    // Create a second user, add to workspace, and add to channel
    const { client: client6, user: user6 } = await createTestClient({
      id: `api-e2e-member-006-${testId()}`,
      displayName: "Member Six",
      email: `member-006-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(client, slug, client6);
    await client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: user6.id },
    });

    // Remove the user via DELETE members endpoint
    const removeRes = await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug, id: channel.id, userId: user6.id },
    });
    expect(removeRes.status).toBe(200);

    // Verify the user is no longer in the member list
    const membersRes = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug, id: channel.id },
    });
    const members = (await membersRes.json()) as { id: string }[];
    expect(members.some((m) => m.id === user6.id)).toBe(false);
  });

  test("add member joins target user's sockets to channel room", async () => {
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sock-join-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    const { client: sockClient, user: sockUser } = await createTestClient({
      id: `api-e2e-sock-join-${testId()}`,
      displayName: "Socket Join User",
      email: `sock-join-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(client, slug, sockClient);

    // Register a mock socket for the target user
    const mockSocketId = `mock-sock-join-${testId()}`;
    const joinedRooms: string[] = [];
    addSocket(sockUser.id, mockSocketId);
    const io = getIO() as unknown as { sockets: { sockets: Map<string, unknown> } };
    io.sockets.sockets.set(mockSocketId, { join: (room: string) => joinedRooms.push(room) });

    try {
      const addRes = await client.api.workspaces[":slug"].channels[":id"].members.$post({
        param: { slug, id: channel.id },
        json: { userId: sockUser.id },
      });
      expect(addRes.status).toBe(201);
      expect(joinedRooms).toContain(`channel:${channel.id}`);
    } finally {
      removeSocket(sockUser.id, mockSocketId);
      io.sockets.sockets.delete(mockSocketId);
    }
  });

  test("remove member removes target user's sockets from channel room", async () => {
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `sock-leave-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    const { client: sockClient2, user: sockUser2 } = await createTestClient({
      id: `api-e2e-sock-leave-${testId()}`,
      displayName: "Socket Leave User",
      email: `sock-leave-${testId()}@openslaq.dev`,
    });
    await addToWorkspace(client, slug, sockClient2);
    await client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug, id: channel.id },
      json: { userId: sockUser2.id },
    });

    // Register a mock socket for the target user
    const mockSocketId2 = `mock-sock-leave-${testId()}`;
    const leftRooms: string[] = [];
    addSocket(sockUser2.id, mockSocketId2);
    const io = getIO() as unknown as { sockets: { sockets: Map<string, unknown> } };
    io.sockets.sockets.set(mockSocketId2, { leave: (room: string) => leftRooms.push(room) });

    try {
      const removeRes = await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
        param: { slug, id: channel.id, userId: sockUser2.id },
      });
      expect(removeRes.status).toBe(200);
      expect(leftRooms).toContain(`channel:${channel.id}`);
    } finally {
      removeSocket(sockUser2.id, mockSocketId2);
      io.sockets.sockets.delete(mockSocketId2);
    }
  });

  test("memberCount decrements after user leaves", async () => {
    // Create a channel
    const createRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `count-${testId()}` },
    });
    const channel = (await createRes.json()) as { id: string };

    // Add second user
    const { client: client4 } = await createTestClient({
      id: "api-e2e-member-004",
      displayName: "Member Four",
      email: "member-004@openslaq.dev",
    });
    await addToWorkspace(client, slug, client4);
    await client4.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });

    // Check initial count = 2
    const listRes1 = await client.api.workspaces[":slug"].channels.$get({ param: { slug } });
    const channels1 = (await listRes1.json()) as { id: string; memberCount: number }[];
    const ch1 = channels1.find((c) => c.id === channel.id)!;
    expect(ch1.memberCount).toBe(2);

    // Second user leaves
    await client4.api.workspaces[":slug"].channels[":id"].leave.$post({
      param: { slug, id: channel.id },
    });

    // Check count = 1
    const listRes2 = await client.api.workspaces[":slug"].channels.$get({ param: { slug } });
    const channels2 = (await listRes2.json()) as { id: string; memberCount: number }[];
    const ch2 = channels2.find((c) => c.id === channel.id)!;
    expect(ch2.memberCount).toBe(1);
  });
});
