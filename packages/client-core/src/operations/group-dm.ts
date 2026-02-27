import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { GroupDmConversation } from "../chat-reducer";
import { normalizeGroupDmConversation } from "./normalize";
import type { OperationDeps } from "./types";

interface CreateGroupDmParams {
  workspaceSlug: string;
  memberIds: string[];
}

export async function createGroupDm(
  deps: OperationDeps,
  params: CreateGroupDmParams,
): Promise<GroupDmConversation | null> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, memberIds } = params;

  try {
    dispatch({ type: "mutations/error", error: null });
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"]["group-dm"].$post(
        { param: { slug: workspaceSlug }, json: { memberIds } },
        { headers },
      ),
    );

    const data = await response.json();
    if (!("channel" in data)) {
      return null;
    }

    const { channel, members } = data;
    const newGroupDm = normalizeGroupDmConversation({ channel, members });
    dispatch({ type: "workspace/addGroupDm", groupDm: newGroupDm });
    dispatch({ type: "workspace/selectGroupDm", channelId: data.channel.id });
    return newGroupDm;
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
      return null;
    }
    dispatch({ type: "mutations/error", error: getErrorMessage(err, "Failed to create group DM") });
    return null;
  }
}
