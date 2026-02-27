import { describe, expect, it } from "bun:test";
import { ApiError, AuthError } from "../errors";
import { authorizedHeaders, authorizedRequest } from "../api-client";
import type { AuthProvider } from "../../platform/types";

function makeAuth(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    getAccessToken: async () => "token-1",
    requireAccessToken: async () => "token-1",
    onAuthRequired: () => {},
    ...overrides,
  };
}

function makeResponse(
  status: number,
  body?: unknown,
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  }) as Response & { ok: boolean };
}

describe("authorizedHeaders", () => {
  it("returns bearer auth header from requireAccessToken", async () => {
    const auth = makeAuth({ requireAccessToken: async () => "abc123" });
    await expect(authorizedHeaders(auth)).resolves.toEqual({ Authorization: "Bearer abc123" });
  });
});

describe("authorizedRequest", () => {
  it("passes authorization headers to request callback", async () => {
    const auth = makeAuth({ requireAccessToken: async () => "pass-through" });

    const response = await authorizedRequest(auth, async (headers) => {
      expect(headers).toEqual({ Authorization: "Bearer pass-through" });
      return makeResponse(200, { ok: true });
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("throws AuthError for 401", async () => {
    const auth = makeAuth();

    await expect(
      authorizedRequest(auth, async () => makeResponse(401, { error: "Unauthorized" })),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("throws ApiError with server message for non-401 failures", async () => {
    const auth = makeAuth();

    await expect(
      authorizedRequest(auth, async () => makeResponse(500, { error: "Boom" })),
    ).rejects.toEqual(expect.objectContaining({ name: "ApiError", message: "Boom", status: 500 }));
  });

  it("uses fallback error when response body is not JSON", async () => {
    const auth = makeAuth();

    await expect(
      authorizedRequest(auth, async () => new Response("not-json", { status: 502 })),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ApiError",
        message: "Request failed with status 502",
        status: 502,
      }),
    );
  });

  it("preserves ApiError status for callers", async () => {
    const auth = makeAuth();

    try {
      await authorizedRequest(auth, async () => makeResponse(409, { error: "Conflict" }));
      throw new Error("Expected call to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
    }
  });
});
