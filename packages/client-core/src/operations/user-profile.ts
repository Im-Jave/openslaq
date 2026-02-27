import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  statusEmoji: string | null;
  statusText: string | null;
  statusExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getCurrentUser(deps: ApiDeps): Promise<UserProfile> {
  const { api, auth } = deps;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.users.me.$get({}, { headers }),
    );
    return (await response.json()) as UserProfile;
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}

export async function updateCurrentUser(
  deps: ApiDeps,
  data: { displayName?: string; avatarUrl?: string | null },
): Promise<UserProfile> {
  const { api, auth } = deps;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.users.me.$patch({ json: data }, { headers }),
    );
    return (await response.json()) as UserProfile;
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}

export async function setUserStatus(
  deps: ApiDeps,
  data: { emoji?: string; text?: string; expiresAt?: string | null },
): Promise<UserProfile> {
  const { api, auth } = deps;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.users.me.status.$put({ json: data }, { headers }),
    );
    return (await response.json()) as UserProfile;
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}

export async function clearUserStatus(deps: ApiDeps): Promise<void> {
  const { api, auth } = deps;

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.users.me.status.$delete({}, { headers }),
    );
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}
