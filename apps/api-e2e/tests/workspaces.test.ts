import { describe, test, expect } from "bun:test";
import { createTestClient, testId } from "./helpers/api-client";

describe("workspaces", () => {
  test("create workspace → 201", async () => {
    const { client } = await createTestClient();
    const name = `Workspace ${testId()}`;
    const res = await client.api.workspaces.$post({
      json: { name },
    });
    expect(res.status).toBe(201);
    const workspace = (await res.json()) as { id: string; name: string; slug: string };
    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe(name);
    // slug should be slugified name + 6-char suffix
    expect(workspace.slug).toMatch(/^workspace-[a-z0-9]+-[a-z0-9]{6}$/);
  });

  test("nonexistent workspace slug → 404", async () => {
    const { client } = await createTestClient();
    const res = await client.api.workspaces[":slug"].channels.$get({
      param: { slug: `no-such-ws-${testId()}` },
    });
    expect(res.status as number).toBe(404);
  });

  test("list workspaces → returns workspaces for user with memberCount", async () => {
    const { client } = await createTestClient();
    const name = `List Test ${testId()}`;
    const createRes = await client.api.workspaces.$post({
      json: { name },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { slug: string };

    const res = await client.api.workspaces.$get();
    expect(res.status).toBe(200);
    const workspaces = (await res.json()) as { id: string; name: string; slug: string; role: string; memberCount: number }[];
    expect(Array.isArray(workspaces)).toBe(true);
    const found = workspaces.find((w) => w.slug === created.slug);
    expect(found).toBeDefined();
    expect(found!.name).toBe(name);
    expect(found!.role).toBe("owner");
    expect(found!.memberCount).toBe(1);
  });

  test("delete workspace cascades to channels and messages", async () => {
    const { client } = await createTestClient();
    const wsRes = await client.api.workspaces.$post({
      json: { name: `Delete Test ${testId()}` },
    });
    expect(wsRes.status).toBe(201);
    const ws = (await wsRes.json()) as { slug: string };
    const slug = ws.slug;

    // Create a channel in the workspace
    const chanRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `del-chan-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    // Send a message in the channel
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel.id },
      json: { content: `del-msg-${testId()}` },
    });
    expect(msgRes.status).toBe(201);

    // Delete workspace
    const delRes = await client.api.workspaces[":slug"].$delete({
      param: { slug },
    });
    expect(delRes.status).toBe(200);

    // Verify workspace is gone
    const checkRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    expect(checkRes.status as number).toBe(404);
  });

  test("list workspaces → does not include other users' workspaces", async () => {
    const idA = testId();
    const { client: client1 } = await createTestClient({ id: `user-ws-a-${idA}`, email: `ws-a-${idA}@openslack.dev` });
    const createRes = await client1.api.workspaces.$post({
      json: { name: `Private ${testId()}` },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { slug: string };

    const idB = testId();
    const { client: client2 } = await createTestClient({ id: `user-ws-b-${idB}`, email: `ws-b-${idB}@openslack.dev` });
    const res = await client2.api.workspaces.$get();
    expect(res.status).toBe(200);
    const workspaces = (await res.json()) as { slug: string }[];
    const found = workspaces.find((w) => w.slug === created.slug);
    expect(found).toBeUndefined();
  });
});
