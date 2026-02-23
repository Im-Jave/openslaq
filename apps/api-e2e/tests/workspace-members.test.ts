import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("workspace members", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;
  });

  test("list members — includes creating user", async () => {
    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as {
      id: string;
      displayName: string;
      email: string;
      role: string;
      createdAt: string;
      joinedAt: string;
    }[];
    expect(members.length).toBe(1);
    expect(members[0]!.id).toBe("api-e2e-user-001");
    expect(members[0]!.role).toBe("owner");
    expect(members[0]!.createdAt).toBeTruthy();
    expect(members[0]!.joinedAt).toBeTruthy();
  });

  test("second user joins — list includes both users", async () => {
    const uid = testId();
    const { client: client2 } = await createTestClient({
      id: `api-e2e-member-002-${uid}`,
      displayName: "Member Two",
      email: `member-002-${uid}@openslack.dev`,
    });
    await addToWorkspace(client, slug, client2);

    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug },
    });
    expect(res.status).toBe(200);
    const members = (await res.json()) as { id: string }[];
    expect(members.length).toBe(2);
    expect(members.some((m) => m.id === "api-e2e-user-001")).toBe(true);
    expect(members.some((m) => m.id === `api-e2e-member-002-${uid}`)).toBe(true);
  });
});
