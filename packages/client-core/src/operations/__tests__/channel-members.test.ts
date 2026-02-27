import { describe, expect, it } from "bun:test";
import { asChannelId, asUserId } from "@openslaq/shared";
import { initialState, type ChatAction } from "../../chat-reducer";
import {
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
} from "../channels";
import type { OperationDeps } from "../types";

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeDeps(channelList: unknown[]) {
  const actions: ChatAction[] = [];

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              $get: () => jsonResponse(200, channelList),
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: () => {},
    },
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => initialState,
  };

  return { deps, actions };
}

describe("operations/channel-members", () => {
  it("adds private channel for current user and emits join", async () => {
    const channelId = asChannelId("ch-private");
    const currentUserId = asUserId("u-current");
    const emitted: Array<{ event: string; payload: unknown }> = [];

    const { deps, actions } = makeDeps([
      {
        id: "ch-private",
        workspaceId: "ws-1",
        name: "secret",
        type: "private",
        description: null,
        createdBy: "u-admin",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    await handleChannelMemberAdded(deps, {
      socket: {
        emit: (event: string, payload: unknown) => {
          emitted.push({ event, payload });
          return true;
        },
      } as never,
      channelId,
      userId: currentUserId,
      currentUserId,
      workspaceSlug: "ws",
    });

    expect(actions).toEqual([
      expect.objectContaining({ type: "workspace/addChannel", channel: expect.objectContaining({ id: "ch-private" }) }),
    ]);
    expect(emitted).toEqual([{ event: "channel:join", payload: { channelId: "ch-private" } }]);
  });

  it("ignores member-added events for other users", async () => {
    const { deps, actions } = makeDeps([]);

    await handleChannelMemberAdded(deps, {
      socket: null,
      channelId: asChannelId("ch-1"),
      userId: asUserId("u-other"),
      currentUserId: "u-current",
      workspaceSlug: "ws",
    });

    expect(actions).toEqual([]);
  });

  it("removes channel and emits leave when current user removed", () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const actions: ChatAction[] = [];

    handleChannelMemberRemoved(
      (action) => actions.push(action),
      {
        socket: {
          emit: (event: string, payload: unknown) => {
            emitted.push({ event, payload });
            return true;
          },
        } as never,
        channelId: asChannelId("ch-1"),
        userId: asUserId("u-current"),
        currentUserId: "u-current",
      },
    );

    expect(actions).toEqual([{ type: "workspace/removeChannel", channelId: "ch-1" }]);
    expect(emitted).toEqual([{ event: "channel:leave", payload: { channelId: "ch-1" } }]);
  });
});
