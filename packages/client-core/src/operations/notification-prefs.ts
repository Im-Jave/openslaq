import { authorizedRequest } from "../api/api-client";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import type { OperationDeps } from "./types";

export async function fetchChannelNotificationPrefs(
  deps: OperationDeps,
  slug: string,
): Promise<Record<string, ChannelNotifyLevel>> {
  const { api, auth, dispatch } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels["notification-prefs"].$get(
      { param: { slug } },
      { headers },
    ),
  );
  const prefs = (await res.json()) as Record<string, ChannelNotifyLevel>;
  dispatch({ type: "notifyPrefs/set", prefs });
  return prefs;
}

interface SetNotificationPrefParams {
  slug: string;
  channelId: string;
  level: ChannelNotifyLevel;
}

export async function setChannelNotificationPref(
  deps: OperationDeps,
  params: SetNotificationPrefParams,
): Promise<void> {
  const { api, auth, dispatch, getState } = deps;
  const { slug, channelId, level } = params;

  // Save previous value for rollback
  const prevLevel = getState().channelNotificationPrefs[channelId] ?? "all";

  // Optimistic update
  dispatch({ type: "notifyPrefs/update", channelId, level });

  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put(
        { param: { slug, id: channelId }, json: { level } },
        { headers },
      ),
    );
  } catch {
    // Rollback
    dispatch({ type: "notifyPrefs/update", channelId, level: prevLevel });
  }
}
