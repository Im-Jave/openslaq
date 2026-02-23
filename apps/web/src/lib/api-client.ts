import { requireAccessToken } from "./auth";
import { ApiError, AuthError } from "./errors";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

type AuthUser = AuthJsonUser | null | undefined;

export async function authorizedHeaders(user: AuthUser): Promise<{ Authorization: string }> {
  const token = await requireAccessToken(user);
  return { Authorization: `Bearer ${token}` };
}

export async function authorizedRequest(
  user: AuthUser,
  request: (headers: { Authorization: string }) => Promise<Response>,
): Promise<Response> {
  const headers = await authorizedHeaders(user);
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
