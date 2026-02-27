import type { AuthProvider } from "../platform/types";
import { ApiError, AuthError } from "./errors";

type ResponseLike = {
  status: number;
  ok: boolean;
  clone: () => { json: () => Promise<unknown> };
};

export async function authorizedHeaders(auth: AuthProvider): Promise<{ Authorization: string }> {
  const token = await auth.requireAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function authorizedRequest<TResponse extends ResponseLike>(
  auth: AuthProvider,
  request: (headers: { Authorization: string }) => Promise<TResponse>,
): Promise<TResponse> {
  const headers = await authorizedHeaders(auth);
  const response = await request(headers);

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.clone().json()) as { error?: string };
      if (typeof body.error === "string" && body.error.trim().length > 0) {
        message = body.error;
      }
    } catch {
      // Ignore non-JSON responses and preserve default message.
    }
    throw new ApiError(response.status, message);
  }

  return response;
}
