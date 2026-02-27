import { describe, test, expect } from "bun:test";
import { createTestClient, testId } from "./helpers/api-client";

describe("users", () => {
  test("GET /me returns current user profile", async () => {
    const id = `user-${testId()}`;
    const { client, user } = await createTestClient({
      id,
      displayName: `Test ${id}`,
      email: `${id}@openslaq.dev`,
    });

    const res = await client.api.users.me.$get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; email: string; displayName: string };
    expect(body.id).toBe(user.id);
    expect(body.email).toBe(user.email);
    expect(body.displayName).toBe(user.displayName);
  });

  test("PATCH /me updates displayName", async () => {
    const id = `user-${testId()}`;
    const { client } = await createTestClient({
      id,
      displayName: `Original ${id}`,
      email: `${id}@openslaq.dev`,
    });

    // Ensure user exists in DB
    await client.api.users.me.$get();

    const res = await client.api.users.me.$patch({
      json: { displayName: "Updated Name" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; displayName: string };
    expect(body.displayName).toBe("Updated Name");
  });

  test("PATCH /me updates avatarUrl", async () => {
    const id = `user-${testId()}`;
    const { client } = await createTestClient({
      id,
      displayName: `Test ${id}`,
      email: `${id}@openslaq.dev`,
    });

    // Ensure user exists in DB
    await client.api.users.me.$get();

    const res = await client.api.users.me.$patch({
      json: { avatarUrl: "https://example.com/avatar.jpg" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; avatarUrl: string | null };
    expect(body.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  test("PATCH /me partial update only changes specified fields", async () => {
    const id = `user-${testId()}`;
    const { client } = await createTestClient({
      id,
      displayName: `Original ${id}`,
      email: `${id}@openslaq.dev`,
    });

    // Ensure user exists in DB
    await client.api.users.me.$get();

    // Update only displayName — verify response includes unchanged email
    const res = await client.api.users.me.$patch({
      json: { displayName: "New Name" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { displayName: string; email: string };
    expect(body.displayName).toBe("New Name");
    expect(body.email).toBe(`${id}@openslaq.dev`);
  });

  test("PATCH /me returns the updated user", async () => {
    const id = `user-${testId()}`;
    const { client } = await createTestClient({
      id,
      displayName: `Test ${id}`,
      email: `${id}@openslaq.dev`,
    });

    // Ensure user exists in DB
    await client.api.users.me.$get();

    const res = await client.api.users.me.$patch({
      json: { displayName: "Final Name", avatarUrl: "data:image/jpeg;base64,abc" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; displayName: string; avatarUrl: string | null; email: string };
    expect(body.id).toBe(id);
    expect(body.displayName).toBe("Final Name");
    expect(body.avatarUrl).toBe("data:image/jpeg;base64,abc");
    expect(body.email).toBe(`${id}@openslaq.dev`);
  });
});
