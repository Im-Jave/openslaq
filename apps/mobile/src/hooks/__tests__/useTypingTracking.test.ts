import { renderHook, act } from "@testing-library/react-native";
import { useTypingTracking } from "../useTypingTracking";

let typingHandler: ((payload: { userId: string; channelId: string }) => void) | null = null;

jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
    },
    status: "connected",
    lastError: null,
    joinChannel: jest.fn(),
    leaveChannel: jest.fn(),
  }),
}));

jest.mock("../useSocketEvent", () => ({
  useSocketEvent: (event: string, handler: (payload: { userId: string; channelId: string }) => void) => {
    if (event === "user:typing") {
      typingHandler = handler;
    }
  },
}));

const members = [
  { id: "user-1", displayName: "Alice" },
  { id: "user-2", displayName: "Bob" },
  { id: "user-3", displayName: "Charlie" },
];

describe("useTypingTracking", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    typingHandler = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("adds a typing user on event", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].displayName).toBe("Alice");
  });

  it("filters out own user", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "user-1", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(0);
  });

  it("filters out events for other channels", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-other" });
    });

    expect(result.current).toHaveLength(0);
  });

  it("expires users after 5s", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(result.current).toHaveLength(0);
  });

  it("refreshes expiry on repeated typing", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Refresh the typing event
    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should still be there (refreshed 3s ago, expires in 2s)
    expect(result.current).toHaveLength(1);
  });

  it("resolves display names from members", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "user-2", channelId: "ch-1" });
    });

    expect(result.current[0].displayName).toBe("Bob");
  });

  it("shows 'Someone' for unknown user", () => {
    const { result } = renderHook(() =>
      useTypingTracking("ch-1", "current-user", members),
    );

    act(() => {
      typingHandler?.({ userId: "unknown-user", channelId: "ch-1" });
    });

    expect(result.current[0].displayName).toBe("Someone");
  });

  it("clears typing users on channel change", () => {
    const { result, rerender } = renderHook(
      ({ channelId }) => useTypingTracking(channelId, "current-user", members),
      { initialProps: { channelId: "ch-1" } },
    );

    act(() => {
      typingHandler?.({ userId: "user-1", channelId: "ch-1" });
    });

    expect(result.current).toHaveLength(1);

    rerender({ channelId: "ch-2" });

    expect(result.current).toHaveLength(0);
  });
});
