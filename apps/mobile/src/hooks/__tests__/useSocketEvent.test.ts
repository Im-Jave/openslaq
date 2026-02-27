import { renderHook, act } from "@testing-library/react-native";
import { useSocketEvent } from "../useSocketEvent";
import { useSocket } from "../../contexts/SocketProvider";

jest.mock("../../contexts/SocketProvider", () => ({
  useSocket: jest.fn(),
}));

const useSocketMock = useSocket as jest.Mock;

describe("useSocketEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing when socket is not available", () => {
    useSocketMock.mockReturnValue({ socket: null });

    renderHook(() =>
      useSocketEvent(
        "presence:sync" as never,
        (() => undefined) as never,
      ),
    );
  });

  it("registers and unregisters socket listeners", () => {
    const on = jest.fn();
    const off = jest.fn();
    useSocketMock.mockReturnValue({ socket: { on, off } });

    const { unmount } = renderHook(() =>
      useSocketEvent(
        "presence:updated" as never,
        (() => undefined) as never,
      ),
    );

    expect(on).toHaveBeenCalledTimes(1);
    const listener = on.mock.calls[0]?.[1];
    expect(listener).toEqual(expect.any(Function));

    unmount();

    expect(off).toHaveBeenCalledWith("presence:updated", listener);
  });

  it("uses the latest handler on rerender", () => {
    const on = jest.fn();
    const off = jest.fn();
    useSocketMock.mockReturnValue({ socket: { on, off } });

    const firstHandler = jest.fn();
    const secondHandler = jest.fn();

    const { rerender } = renderHook(
      ({ handler }) =>
        useSocketEvent("message:new" as never, handler as never),
      {
        initialProps: { handler: firstHandler },
      },
    );

    const listener = on.mock.calls[0]?.[1] as ((...args: unknown[]) => void);
    act(() => {
      listener({ id: "message-1" });
    });

    rerender({ handler: secondHandler });
    act(() => {
      listener({ id: "message-2" });
    });

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(firstHandler).toHaveBeenCalledWith({ id: "message-1" });
    expect(secondHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledWith({ id: "message-2" });
  });
});
