import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import { createDm } from "../dm";
import type { OperationDeps } from "../types";

function makeDeps(resolver: () => Promise<Response>) {
  const actions: ChatAction[] = [];
  let authRequired = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            dm: {
              $post: () => resolver(),
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: () => {
        authRequired += 1;
      },
    },
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => initialState,
  };

  return { deps, actions, getAuthRequired: () => authRequired };
}

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

const dmPayload = {
  channel: {
    id: "dm-1",
    workspaceId: "ws-1",
    name: "dm-1",
    type: "dm",
    description: null,
    createdBy: "u-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  otherUser: {
    id: "u-2",
    displayName: "Bob",
    avatarUrl: null,
  },
};

describe("operations/dm", () => {
  it("dispatches add/select on success", async () => {
    const { deps, actions } = makeDeps(() => jsonResponse(201, dmPayload));

    const dm = await createDm(deps, { workspaceSlug: "ws", targetUserId: "u-2" });

    expect(dm).not.toBeNull();
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
      expect.objectContaining({ type: "workspace/addDm" }),
      { type: "workspace/selectDm", channelId: "dm-1" },
    ]);
  });

  it("returns null when payload missing otherUser", async () => {
    const { deps, actions } = makeDeps(() =>
      jsonResponse(200, {
        channel: dmPayload.channel,
      }),
    );

    const dm = await createDm(deps, { workspaceSlug: "ws", targetUserId: "u-2" });

    expect(dm).toBeNull();
    expect(actions).toEqual([{ type: "mutations/error", error: null }]);
  });

  it("handles auth failures via onAuthRequired", async () => {
    const { deps, actions, getAuthRequired } = makeDeps(() => Promise.resolve(new Response(null, { status: 401 })));

    const dm = await createDm(deps, { workspaceSlug: "ws", targetUserId: "u-2" });

    expect(dm).toBeNull();
    expect(getAuthRequired()).toBe(1);
    expect(actions).toEqual([{ type: "mutations/error", error: null }]);
  });

  it("sets mutation error on non-auth failures", async () => {
    const { deps, actions } = makeDeps(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })),
    );

    const dm = await createDm(deps, { workspaceSlug: "ws", targetUserId: "u-2" });

    expect(dm).toBeNull();
    expect(actions).toEqual([
      { type: "mutations/error", error: null },
      { type: "mutations/error", error: "Bad request" },
    ]);
  });
});
