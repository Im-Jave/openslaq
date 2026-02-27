import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export async function getInvite(
  deps: ApiDeps,
  code: string,
): Promise<{ workspaceName: string; workspaceSlug: string }> {
  const { api, auth } = deps;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.invites[":code"].$get({ param: { code } }, { headers }),
    );
    return (await response.json()) as { workspaceName: string; workspaceSlug: string };
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}

export async function acceptInvite(
  deps: ApiDeps,
  code: string,
): Promise<{ slug: string }> {
  const { api, auth } = deps;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.invites[":code"].accept.$post({ param: { code } }, { headers }),
    );
    return (await response.json()) as { slug: string };
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}
