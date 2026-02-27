import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";

describe("channel archiving", () => {
  let ownerClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let memberClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    ownerClient = ctx.client;
    const workspace = await createTestWorkspace(ownerClient);
    slug = workspace.slug;

    const memberCtx = await createTestClient({
      id: `archive-member-${testId()}`,
      displayName: "Archive Member",
      email: `archive-member-${testId()}@openslaq.dev`,
    });
    memberClient = memberCtx.client;
    await addToWorkspace(ownerClient, slug, memberClient);
  });

  test("admin can archive a public channel", async () => {
    const name = `arch-pub-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string; isArchived: boolean };
    expect(channel.isArchived).toBe(false);

    const archiveRes = await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });
    expect(archiveRes.status).toBe(200);
    const archived = (await archiveRes.json()) as { id: string; isArchived: boolean };
    expect(archived.isArchived).toBe(true);
  });

  test("admin can archive a private channel", async () => {
    const name = `arch-priv-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "private" },
    });
    const channel = (await createRes.json()) as { id: string };

    const archiveRes = await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });
    expect(archiveRes.status).toBe(200);
    const archived = (await archiveRes.json()) as { isArchived: boolean };
    expect(archived.isArchived).toBe(true);
  });

  test("non-admin cannot archive a channel", async () => {
    const name = `arch-nonadmin-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Member joins the channel first
    await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });

    const archiveRes = await memberClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });
    expect(archiveRes.status).toBe(403);
  });

  test("cannot archive #general", async () => {
    // Find the #general channel
    const listRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string; name: string }[];
    const general = channels.find((c) => c.name === "general");
    expect(general).toBeDefined();

    const archiveRes = await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: general!.id },
    });
    expect(archiveRes.status).toBe(400);
  });

  test("archived channel excluded from GET /channels list", async () => {
    const name = `arch-list-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const listRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string }[];
    const found = channels.find((c) => c.id === channel.id);
    expect(found).toBeUndefined();
  });

  test("archived channel excluded from browse by default", async () => {
    const name = `arch-browse-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const browseRes = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: {},
    });
    const channels = (await browseRes.json()) as { id: string }[];
    const found = channels.find((c) => c.id === channel.id);
    expect(found).toBeUndefined();
  });

  test("archived channel included in browse with ?includeArchived=true", async () => {
    const name = `arch-browse-inc-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const browseRes = await ownerClient.api.workspaces[":slug"].channels.browse.$get({
      param: { slug },
      query: { includeArchived: "true" },
    });
    const channels = (await browseRes.json()) as { id: string; isArchived: boolean }[];
    const found = channels.find((c) => c.id === channel.id);
    expect(found).toBeDefined();
    expect(found!.isArchived).toBe(true);
  });

  test("cannot post message to archived channel", async () => {
    const name = `arch-msg-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const msgRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel.id },
      json: { content: "should fail" },
    });
    expect(msgRes.status).toBe(403);
  });

  test("cannot post thread reply to archived channel", async () => {
    const name = `arch-reply-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Create a message before archiving
    const msgRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channel.id },
      json: { content: "parent message" },
    });
    const message = (await msgRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const replyRes = await ownerClient.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug, id: channel.id, messageId: message.id },
      json: { content: "should fail" },
    });
    expect(replyRes.status).toBe(403);
  });

  test("cannot join archived channel", async () => {
    const name = `arch-join-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const joinRes = await memberClient.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug, id: channel.id },
    });
    expect(joinRes.status).toBe(403);
  });

  test("admin can unarchive a channel", async () => {
    const name = `arch-unarch-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    const unarchiveRes = await ownerClient.api.workspaces[":slug"].channels[":id"].unarchive.$post({
      param: { slug, id: channel.id },
    });
    expect(unarchiveRes.status).toBe(200);
    const unarchived = (await unarchiveRes.json()) as { isArchived: boolean };
    expect(unarchived.isArchived).toBe(false);
  });

  test("unarchived channel reappears in channel list", async () => {
    const name = `arch-reappear-${testId()}`;
    const createRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name, type: "public" },
    });
    const channel = (await createRes.json()) as { id: string };

    // Archive
    await ownerClient.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug, id: channel.id },
    });

    // Verify absent
    let listRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    let channels = (await listRes.json()) as { id: string }[];
    expect(channels.find((c) => c.id === channel.id)).toBeUndefined();

    // Unarchive
    await ownerClient.api.workspaces[":slug"].channels[":id"].unarchive.$post({
      param: { slug, id: channel.id },
    });

    // Verify present
    listRes = await ownerClient.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    channels = (await listRes.json()) as { id: string }[];
    expect(channels.find((c) => c.id === channel.id)).toBeDefined();
  });
});
