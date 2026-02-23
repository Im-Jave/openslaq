import { useEffect, useRef } from "react";
import type { ServerToClientEvents } from "@openslack/shared";
import { useSocket } from "./useSocket";

export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
) {
  const { socket } = useSocket();
  const handlerRef = useRef<ServerToClientEvents[E]>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;
    const socketApi = socket as unknown as {
      on: (event: E, listener: (...args: unknown[]) => void) => void;
      off: (event: E, listener: (...args: unknown[]) => void) => void;
    };

    const listener = (...args: unknown[]) => {
      const current = handlerRef.current as (...listenerArgs: unknown[]) => void;
      current(...args);
    };

    socketApi.on(event, listener);
    return () => {
      socketApi.off(event, listener);
    };
  }, [socket, event]);
}
