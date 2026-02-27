import type { Channel, ChannelId, UserId } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { ChatAction } from "../chat-reducer";
import type { TypedSocket } from "../socket/socketManager";
import { normalizeChannel } from "./normalize";
import type { OperationDeps, ApiDeps } from "./types";

interface HandleMemberAddedParams {
  socket: TypedSocket | null;
  channelId: ChannelId;
  userId: UserId;
  currentUserId: string;
  workspaceSlug: string;
}

export async function handleChannelMemberAdded(
  deps: OperationDeps,
  params: HandleMemberAddedParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { socket, channelId, userId, currentUserId, workspaceSlug } = params;

  if (userId !== currentUserId) return;

  // Current user was added to a private channel — re-fetch channels to add it
  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels.$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const channels = (await res.json()).map(normalizeChannel);
  const newChannel = channels.find((c) => c.id === channelId);
  if (newChannel) {
    dispatch({ type: "workspace/addChannel", channel: newChannel });
    socket?.emit("channel:join", { channelId });
  }
}

interface HandleMemberRemovedParams {
  socket: TypedSocket | null;
  channelId: ChannelId;
  userId: UserId;
  currentUserId: string;
}

export function handleChannelMemberRemoved(
  dispatch: (action: ChatAction) => void,
  params: HandleMemberRemovedParams,
): void {
  const { socket, channelId, userId, currentUserId } = params;

  if (userId !== currentUserId) return;

  // Current user was removed from a private channel
  dispatch({ type: "workspace/removeChannel", channelId });
  socket?.emit("channel:leave", { channelId });
}

// ── Channel CRUD operations ──────────────────────────────────────────────

export interface BrowseChannel extends Channel {
  isMember: boolean;
}

interface CreateChannelParams {
  workspaceSlug: string;
  name: string;
  type?: "public" | "private";
  description?: string;
}

export async function createChannel(
  deps: OperationDeps,
  params: CreateChannelParams,
): Promise<Channel> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, name, type, description } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels.$post(
      { param: { slug: workspaceSlug }, json: { name, type, description } },
      { headers },
    ),
  );
  const channel = normalizeChannel(await res.json() as Parameters<typeof normalizeChannel>[0]);
  dispatch({ type: "workspace/addChannel", channel });
  return channel;
}

interface JoinChannelParams {
  workspaceSlug: string;
  channelId: ChannelId;
  socket: TypedSocket | null;
}

export async function joinChannel(
  deps: OperationDeps,
  params: JoinChannelParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, socket } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].join.$post(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );

  // Re-fetch channels to get the full Channel object
  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels.$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const channels = (await res.json()).map(normalizeChannel);
  const newChannel = channels.find((c) => c.id === channelId);
  if (newChannel) {
    dispatch({ type: "workspace/addChannel", channel: newChannel });
    socket?.emit("channel:join", { channelId });
  }
}

interface LeaveChannelParams {
  workspaceSlug: string;
  channelId: ChannelId;
  socket: TypedSocket | null;
}

export async function leaveChannel(
  deps: OperationDeps,
  params: LeaveChannelParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, socket } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].leave.$post(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );

  dispatch({ type: "workspace/removeChannel", channelId });
  socket?.emit("channel:leave", { channelId });
}

interface UpdateChannelDescriptionParams {
  workspaceSlug: string;
  channelId: ChannelId;
  description: string | null;
}

export async function updateChannelDescription(
  deps: OperationDeps,
  params: UpdateChannelDescriptionParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId, description } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].$patch(
      { param: { slug: workspaceSlug, id: channelId }, json: { description } },
      { headers },
    ),
  );
  const channel = normalizeChannel(await res.json() as Parameters<typeof normalizeChannel>[0]);
  dispatch({ type: "workspace/updateChannel", channel });
}

interface ArchiveChannelParams {
  workspaceSlug: string;
  channelId: ChannelId;
}

export async function archiveChannel(
  deps: OperationDeps,
  params: ArchiveChannelParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].archive.$post(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );
  const channel = normalizeChannel(await res.json() as Parameters<typeof normalizeChannel>[0]);
  dispatch({ type: "workspace/updateChannel", channel });
}

export async function unarchiveChannel(
  deps: OperationDeps,
  params: ArchiveChannelParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug, channelId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].unarchive.$post(
      { param: { slug: workspaceSlug, id: channelId } },
      { headers },
    ),
  );
  const channel = normalizeChannel(await res.json() as Parameters<typeof normalizeChannel>[0]);
  dispatch({ type: "workspace/updateChannel", channel });
}

export async function browseChannels(
  deps: ApiDeps,
  slug: string,
  includeArchived = false,
): Promise<BrowseChannel[]> {
  const { api, auth } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels.browse.$get(
      { param: { slug }, query: includeArchived ? { includeArchived: "true" } : {} },
      { headers },
    ),
  );
  const data = await res.json() as Array<Parameters<typeof normalizeChannel>[0] & { isMember: boolean }>;
  return data.map((ch) => ({
    ...normalizeChannel(ch),
    isMember: ch.isMember,
  }));
}
