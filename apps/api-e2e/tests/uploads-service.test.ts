import { describe, test, expect } from "bun:test";
import { canAccessAttachment } from "../../api/src/uploads/service";
import { addToWorkspace, createTestClient, createTestWorkspace, testId } from "./helpers/api-client";

describe("uploads service", () => {
  test("canAccessAttachment: unlinked attachments are uploader-only", async () => {
    const uploader = await createTestClient({
      id: `uploads-uploader-${testId()}`,
      email: `uploads-uploader-${testId()}@openslaq.dev`,
    });
    const other = await createTestClient({
      id: `uploads-other-${testId()}`,
      email: `uploads-other-${testId()}@openslaq.dev`,
    });

    const attachment = { messageId: null, uploadedBy: uploader.user.id };
    expect(await canAccessAttachment(attachment, uploader.user.id)).toBe(true);
    expect(await canAccessAttachment(attachment, other.user.id)).toBe(false);
  });

  test("canAccessAttachment: linked attachments in public channels are accessible to workspace members", async () => {
    const owner = await createTestClient({
      id: `uploads-owner-${testId()}`,
      email: `uploads-owner-${testId()}@openslaq.dev`,
    });
    const member = await createTestClient({
      id: `uploads-member-${testId()}`,
      email: `uploads-member-${testId()}@openslaq.dev`,
    });
    const outsider = await createTestClient({
      id: `uploads-outsider-${testId()}`,
      email: `uploads-outsider-${testId()}@openslaq.dev`,
    });

    const ws = await createTestWorkspace(owner.client);
    await addToWorkspace(owner.client, ws.slug, member.client);

    const chanRes = await owner.client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `uploads-access-${testId()}` },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    const msgRes = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: `attachment access message ${testId()}` },
    });
    expect(msgRes.status).toBe(201);
    const message = (await msgRes.json()) as { id: string };

    const attachment = { messageId: message.id, uploadedBy: owner.user.id };
    expect(await canAccessAttachment(attachment, member.user.id)).toBe(true);
    expect(await canAccessAttachment(attachment, outsider.user.id)).toBe(false);
  });

  test("canAccessAttachment: private channel attachments denied to non-channel-members", async () => {
    const uid = testId();
    const owner = await createTestClient({
      id: `uploads-priv-owner-${uid}`,
      email: `uploads-priv-owner-${uid}@openslaq.dev`,
    });
    const wsMember = await createTestClient({
      id: `uploads-priv-wsmem-${uid}`,
      email: `uploads-priv-wsmem-${uid}@openslaq.dev`,
    });

    const ws = await createTestWorkspace(owner.client);
    await addToWorkspace(owner.client, ws.slug, wsMember.client);

    // Owner creates a private channel (only owner is a member)
    const chanRes = await owner.client.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `uploads-priv-${uid}`, type: "private" },
    });
    expect(chanRes.status).toBe(201);
    const channel = (await chanRes.json()) as { id: string };

    // Owner posts a message in the private channel
    const msgRes = await owner.client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: ws.slug, id: channel.id },
      json: { content: `private attachment msg ${uid}` },
    });
    expect(msgRes.status).toBe(201);
    const message = (await msgRes.json()) as { id: string };

    const attachment = { messageId: message.id, uploadedBy: owner.user.id };
    // Owner (channel member) can access
    expect(await canAccessAttachment(attachment, owner.user.id)).toBe(true);
    // Workspace member who is NOT in the private channel cannot access
    expect(await canAccessAttachment(attachment, wsMember.user.id)).toBe(false);
  });
});
