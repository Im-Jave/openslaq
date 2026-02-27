import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

function makeTestFile(name: string, content: string, type: string): File {
  return new File([content], name, { type });
}

async function uploadFirstAttachment(headers: HeadersInit, file: File): Promise<string> {
  const form = new FormData();
  form.append("files", file);
  const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
    method: "POST",
    headers,
    body: form,
  });
  const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
  return attachments[0]!.id;
}

async function createChannel(
  ownerClient: ReturnType<typeof hc<AppType>>,
  slug: string,
  name: string,
): Promise<string> {
  const chanRes = await ownerClient.api.workspaces[":slug"].channels.$post({
    param: { slug },
    json: { name },
  });
  const chan = (await chanRes.json()) as { id: string };
  return chan.id;
}

async function postMessageWithAttachment(
  slug: string,
  channelId: string,
  headers: HeadersInit,
  content: string,
  attachmentId: string,
) {
  await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ content, attachmentIds: [attachmentId] }),
  });
}

describe("uploads", () => {
  let client: ReturnType<typeof hc<AppType>>;
  let headers: Record<string, string>;
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    headers = ctx.headers;

    const workspace = await createTestWorkspace(ctx.client);
    slug = workspace.slug;

    const res = await ctx.client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `upload-test-${testId()}`, description: "upload tests" },
    });
    const channel = (await res.json()) as { id: string };
    channelId = channel.id;
  });

  test("upload single file → 201", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("test.txt", "hello world", "text/plain"));

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { attachments: { id: string; filename: string; mimeType: string; size: number; downloadUrl: string }[] };
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0]!.filename).toBe("test.txt");
    expect(body.attachments[0]!.mimeType).toStartWith("text/plain");
    expect(body.attachments[0]!.size).toBe(11);
    expect(body.attachments[0]!.downloadUrl).toBeTruthy();
  });

  test("upload multiple files → 201", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("a.txt", "aaa", "text/plain"));
    form.append("files", makeTestFile("b.txt", "bbb", "text/plain"));
    form.append("files", makeTestFile("c.txt", "ccc", "text/plain"));

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { attachments: { id: string }[] };
    expect(body.attachments).toHaveLength(3);
  });

  test("upload with no files → 400", async () => {
    const form = new FormData();

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(400);
  });

  test("upload >10 files → 400", async () => {
    const form = new FormData();
    for (let i = 0; i < 11; i++) {
      form.append("files", makeTestFile(`file-${i}.txt`, `content-${i}`, "text/plain"));
    }

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(400);
  });

  test("oversized file → 400", async () => {
    const form = new FormData();
    // Create a blob that claims to be >50MB (we use a small actual payload but set size via File constructor)
    const bigContent = new Uint8Array(50 * 1024 * 1024 + 1); // 50MB + 1 byte
    form.append("files", new File([bigContent], "huge.txt", { type: "text/plain" }));

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("exceeds maximum size");
  });

  test("disallowed MIME type → 400", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("malware.exe", "not really", "application/x-msdownload"));

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not allowed");
  });

  test("upload without auth → 401", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("test.txt", "hello", "text/plain"));

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(401);
  });

  test("download without auth → 401", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("noauth-dl.txt", "no auth", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments: atts } = (await uploadRes.json()) as { attachments: { id: string }[] };

    const res = await fetch(`${getBaseUrl()}/api/uploads/${atts[0]!.id}/download`, {
      redirect: "manual",
    });
    expect(res.status).toBe(401);
  });

  test("download uploaded file → 302 redirect", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("download-test.txt", "download me", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
    const attachmentId = attachments[0]!.id;

    const res = await fetch(`${getBaseUrl()}/api/uploads/${attachmentId}/download`, {
      headers,
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBeTruthy();
  });

  test("download nonexistent attachment → 404", async () => {
    const res = await fetch(`${getBaseUrl()}/api/uploads/00000000-0000-0000-0000-000000000000/download`, {
      headers,
    });
    expect(res.status).toBe(404);
  });

  test("uploader can download own unlinked attachment", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("own-unlinked.txt", "my file", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments: atts } = (await uploadRes.json()) as { attachments: { id: string }[] };

    const res = await fetch(`${getBaseUrl()}/api/uploads/${atts[0]!.id}/download`, {
      headers,
      redirect: "manual",
    });
    expect(res.status).toBe(302);
  });

  test("non-uploader cannot download unlinked attachment → 404", async () => {
    const uid = testId();
    // Upload as main user
    const form = new FormData();
    form.append("files", makeTestFile("private-unlinked.txt", "private", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments: atts } = (await uploadRes.json()) as { attachments: { id: string }[] };

    // Try to download as different user
    const { headers: otherHeaders } = await createTestClient({ id: `other-dl-${uid}`, email: `other-dl-${uid}@openslaq.dev` });
    const res = await fetch(`${getBaseUrl()}/api/uploads/${atts[0]!.id}/download`, {
      headers: otherHeaders,
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });

  test("workspace member can download attachment from channel message", async () => {
    const uid = testId();
    // Create a workspace with two members
    const { client: ownerClient, headers: ownerHeaders } = await createTestClient({ id: `dl-owner-${uid}`, email: `dl-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(ownerClient);

    const { client: memberClient, headers: memberHeaders } = await createTestClient({ id: `dl-member-${uid}`, email: `dl-member-${uid}@openslaq.dev` });
    await addToWorkspace(ownerClient, ws.slug, memberClient);

    // Owner creates a channel
    const channelId = await createChannel(ownerClient, ws.slug, `dl-test-${uid}`);

    // Owner uploads and sends message with attachment
    const attachmentId = await uploadFirstAttachment(
      ownerHeaders,
      makeTestFile("member-dl.txt", "member can see", "text/plain"),
    );
    await postMessageWithAttachment(ws.slug, channelId, ownerHeaders, "file for you", attachmentId);

    // Member downloads the attachment
    const res = await fetch(`${getBaseUrl()}/api/uploads/${attachmentId}/download`, {
      headers: memberHeaders,
      redirect: "manual",
    });
    expect(res.status).toBe(302);
  });

  test("non-member cannot download workspace attachment → 404", async () => {
    const uid = testId();
    // Create a workspace with only the owner
    const { client: ownerClient, headers: ownerHeaders } = await createTestClient({ id: `dl-priv-owner-${uid}`, email: `dl-priv-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(ownerClient);

    // Owner creates channel and posts message with attachment
    const channelId = await createChannel(ownerClient, ws.slug, `dl-priv-${uid}`);
    const attachmentId = await uploadFirstAttachment(
      ownerHeaders,
      makeTestFile("private-ws.txt", "private workspace file", "text/plain"),
    );
    await postMessageWithAttachment(ws.slug, channelId, ownerHeaders, "secret file", attachmentId);

    // Non-member tries to download
    const { headers: outsiderHeaders } = await createTestClient({ id: `dl-outsider-${uid}`, email: `dl-outsider-${uid}@openslaq.dev` });
    const res = await fetch(`${getBaseUrl()}/api/uploads/${attachmentId}/download`, {
      headers: outsiderHeaders,
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });

  test("send message with attachmentIds → message includes attachments", async () => {
    // Upload a file first
    const form = new FormData();
    form.append("files", makeTestFile("attached.txt", "attached content", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
    const attachmentId = attachments[0]!.id;

    // Send message with attachment
    const msgRes = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "message with file", attachmentIds: [attachmentId] }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string; attachments: { id: string; filename: string }[] };
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0]!.filename).toBe("attached.txt");
  });

  test("cannot re-link already-attached file → 400", async () => {
    // Upload and attach to first message
    const form = new FormData();
    form.append("files", makeTestFile("relink.txt", "no relink", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
    const attachmentId = attachments[0]!.id;

    // Attach to first message
    await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "first", attachmentIds: [attachmentId] }),
    });

    // Try to attach same file to second message
    const msg2Res = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "second", attachmentIds: [attachmentId] }),
    });
    expect(msg2Res.status).toBe(400);
    const body = (await msg2Res.json()) as { error: string };
    expect(body.error).toContain("invalid or already linked");
  });

  test("message with nonexistent attachment ID → 400", async () => {
    const res = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "bad attachment", attachmentIds: ["00000000-0000-0000-0000-000000000000"] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("invalid or already linked");
  });

  test("message with another user's attachment → 400", async () => {
    const uid = testId();
    // Upload as a different user
    const { headers: otherHeaders } = await createTestClient({ id: `other-uploader-${uid}`, email: `other-uploader-${uid}@openslaq.dev` });
    const form = new FormData();
    form.append("files", makeTestFile("other.txt", "other user file", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers: otherHeaders,
      body: form,
    });
    const { attachments: otherAtts } = (await uploadRes.json()) as { attachments: { id: string }[] };

    // Try to use that attachment in our message
    const res = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "stolen attachment", attachmentIds: [otherAtts[0]!.id] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("invalid or already linked");
  });

  test("list messages includes attachments", async () => {
    // Create a fresh channel
    const ctx = await createTestClient();
    const chanRes = await ctx.client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `att-list-${testId()}` },
    });
    const chan = (await chanRes.json()) as { id: string };

    // Upload and send message with attachment
    const form = new FormData();
    form.append("files", makeTestFile("listed.txt", "listed content", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };

    await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${chan.id}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "with attachment", attachmentIds: [attachments[0]!.id] }),
    });

    // List messages
    const listRes = await ctx.client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: chan.id },
      query: {},
    });
    const body = (await listRes.json()) as { messages: { attachments: { id: string; filename: string }[] }[] };
    const msgWithAtt = body.messages.find((m) => m.attachments.length > 0);
    expect(msgWithAtt).toBeDefined();
    expect(msgWithAtt!.attachments[0]!.filename).toBe("listed.txt");
  });

  test("delete message with attachments cleans up", async () => {
    // Upload a file
    const form = new FormData();
    form.append("files", makeTestFile("cleanup.txt", "to be deleted", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
    const attachmentId = attachments[0]!.id;

    // Create message with attachment
    const msgRes = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "message with cleanup file", attachmentIds: [attachmentId] }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Delete the message (exercises deleteFromS3 path)
    const deleteRes = await client.api.messages[":id"].$delete({
      param: { id: msg.id },
    });
    expect(deleteRes.status).toBe(200);

    // Verify the message is gone
    const listRes = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      headers,
    });
    const listBody = (await listRes.json()) as { messages: { id: string }[] };
    const found = listBody.messages.find((m) => m.id === msg.id);
    expect(found).toBeUndefined();
  });

  test("upload with string form values instead of files → 400", async () => {
    const form = new FormData();
    form.append("files", "not-a-file");

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(400);
  });

  test("HTML file upload → 400 (XSS prevention)", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("evil.html", "<script>alert('xss')</script>", "text/html"));

    const res = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not allowed");
  });

  test("message attachments include downloadUrl", async () => {
    const form = new FormData();
    form.append("files", makeTestFile("url-test.txt", "url test content", "text/plain"));

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };

    const msgRes = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "file with url", attachmentIds: [attachments[0]!.id] }),
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { attachments: { downloadUrl: string }[] };
    expect(msg.attachments[0]!.downloadUrl).toBeTruthy();
  });

  test("non-channel-member cannot download private channel attachment → 404", async () => {
    const uid = testId();
    // Create workspace with owner and member
    const { client: ownerClient, headers: ownerHeaders } = await createTestClient({ id: `priv-owner-${uid}`, email: `priv-owner-${uid}@openslaq.dev` });
    const ws = await createTestWorkspace(ownerClient);

    const { headers: memberHeaders } = await createTestClient({ id: `priv-member-${uid}`, email: `priv-member-${uid}@openslaq.dev` });
    // Add member to workspace but NOT to the private channel
    const { client: memberClient } = await createTestClient({ id: `priv-member-${uid}`, email: `priv-member-${uid}@openslaq.dev` });
    await addToWorkspace(ownerClient, ws.slug, memberClient);

    // Owner creates a private channel
    const chanRes = await ownerClient.api.workspaces[":slug"].channels.$post({
      param: { slug: ws.slug },
      json: { name: `priv-upload-${uid}`, type: "private" },
    });
    expect(chanRes.status).toBe(201);
    const privateChan = (await chanRes.json()) as { id: string };

    // Owner uploads file and posts to private channel
    const attachmentId = await uploadFirstAttachment(
      ownerHeaders,
      makeTestFile("private-file.txt", "secret content", "text/plain"),
    );
    await postMessageWithAttachment(ws.slug, privateChan.id, ownerHeaders, "private file", attachmentId);

    // Workspace member (not channel member) tries to download → should be denied
    const res = await fetch(`${getBaseUrl()}/api/uploads/${attachmentId}/download`, {
      headers: memberHeaders,
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });
});
