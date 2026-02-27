import { renderHook, act } from "@testing-library/react-native";
import { editMessage, deleteMessage, toggleReaction } from "@openslaq/client-core";
import type { AuthProvider, ChatStoreState } from "@openslaq/client-core";
import { api } from "@/lib/api";
import { useMessageActions } from "../useMessageActions";

jest.mock("@openslaq/client-core", () => ({
  createApiClient: jest.fn(() => ({ __api: "mock-api-client" })),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  toggleReaction: jest.fn(),
}));

const editMessageMock = editMessage as jest.Mock;
const deleteMessageMock = deleteMessage as jest.Mock;
const toggleReactionMock = toggleReaction as jest.Mock;

describe("useMessageActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls editMessage with expected dependencies", async () => {
    const authProvider = {
      getAccessToken: jest.fn(),
      requireAccessToken: jest.fn(),
      onAuthRequired: jest.fn(),
    } as unknown as AuthProvider;
    const dispatch = jest.fn();
    const state = { activeChannelId: "channel-1" } as unknown as ChatStoreState;
    const { result } = renderHook(() =>
      useMessageActions({ authProvider, dispatch, state, userId: "user-1" }),
    );

    await act(async () => {
      await result.current.handleEditMessage("message-1", "updated");
    });

    expect(editMessageMock).toHaveBeenCalledTimes(1);
    const [deps, payload] = editMessageMock.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(deps.api).toBe(api);
    expect(deps.auth).toBe(authProvider);
    expect(deps.dispatch).toBe(dispatch);
    expect((deps.getState as () => unknown)()).toBe(state);
    expect(payload).toEqual({ messageId: "message-1", content: "updated" });
  });

  it("calls deleteMessage with expected payload", async () => {
    const authProvider = {
      getAccessToken: jest.fn(),
      requireAccessToken: jest.fn(),
      onAuthRequired: jest.fn(),
    } as unknown as AuthProvider;
    const dispatch = jest.fn();
    const state = {} as unknown as ChatStoreState;
    const { result } = renderHook(() =>
      useMessageActions({ authProvider, dispatch, state, userId: "user-1" }),
    );

    await act(async () => {
      await result.current.handleDeleteMessage("message-2");
    });

    expect(deleteMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        api,
        auth: authProvider,
        dispatch,
      }),
      { messageId: "message-2" },
    );
  });

  it("does not call toggleReaction when no userId is available", async () => {
    const authProvider = {
      getAccessToken: jest.fn(),
      requireAccessToken: jest.fn(),
      onAuthRequired: jest.fn(),
    } as unknown as AuthProvider;
    const dispatch = jest.fn();
    const state = {} as unknown as ChatStoreState;
    const { result } = renderHook(() =>
      useMessageActions({ authProvider, dispatch, state }),
    );

    await act(async () => {
      await result.current.handleToggleReaction("message-3", ":+1:");
    });

    expect(toggleReactionMock).not.toHaveBeenCalled();
  });

  it("calls toggleReaction with current userId", async () => {
    const authProvider = {
      getAccessToken: jest.fn(),
      requireAccessToken: jest.fn(),
      onAuthRequired: jest.fn(),
    } as unknown as AuthProvider;
    const dispatch = jest.fn();
    const state = {} as unknown as ChatStoreState;
    const { result } = renderHook(() =>
      useMessageActions({ authProvider, dispatch, state, userId: "user-42" }),
    );

    await act(async () => {
      await result.current.handleToggleReaction("message-3", ":+1:");
    });

    expect(toggleReactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        api,
        auth: authProvider,
        dispatch,
      }),
      { messageId: "message-3", emoji: ":+1:", userId: "user-42" },
    );
  });
});
