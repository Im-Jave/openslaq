import type { SearchResultItem } from "@openslaq/shared";
import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

interface SearchMessagesParams {
  workspaceSlug: string;
  q: string;
  offset: number;
  limit: number;
  channelId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function searchMessages(
  deps: ApiDeps,
  params: SearchMessagesParams,
): Promise<{ results: SearchResultItem[]; total: number }> {
  const { api, auth } = deps;
  const { workspaceSlug: slug, q, offset, limit, channelId, userId, fromDate, toDate } = params;

  const query: {
    q: string;
    offset: number;
    limit: number;
    channelId?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
  } = { q, offset, limit };
  if (channelId) query.channelId = channelId;
  if (userId) query.userId = userId;
  if (fromDate) query.fromDate = fromDate;
  if (toDate) query.toDate = toDate;

  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].search.$get(
        { param: { slug }, query },
        { headers },
      ),
    );

    return (await response.json()) as { results: SearchResultItem[]; total: number };
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
    }
    throw err;
  }
}
