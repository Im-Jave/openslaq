import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChannelId } from "@openslaq/shared";
import {
  SocketManager,
  type SocketSnapshot,
} from "@openslaq/client-core";
import { useAuth } from "./AuthContext";
import { env } from "../lib/env";

export interface SocketContextValue extends SocketSnapshot {
  joinChannel: (channelId: ChannelId) => void;
  leaveChannel: (channelId: ChannelId) => void;
}

const defaultSnapshot: SocketSnapshot = {
  socket: null,
  status: "idle",
  lastError: null,
};

const SocketContext = createContext<SocketContextValue>({
  ...defaultSnapshot,
  joinChannel: () => {},
  leaveChannel: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authProvider } = useAuth();
  const managerRef = useRef<SocketManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new SocketManager({
      apiUrl: env.EXPO_PUBLIC_API_URL,
    });
  }
  const manager = managerRef.current;

  const [snapshot, setSnapshot] = useState<SocketSnapshot>(defaultSnapshot);

  useEffect(() => manager.subscribe(setSnapshot), [manager]);

  useEffect(() => {
    if (!isAuthenticated) {
      manager.disconnectForLogout();
      return;
    }

    void manager.connect(() => authProvider.getAccessToken());
  }, [manager, isAuthenticated, authProvider]);

  useEffect(
    () => () => {
      manager.destroy();
    },
    [manager],
  );

  const contextValue = useMemo(
    () => ({
      socket: snapshot.socket,
      status: snapshot.status,
      lastError: snapshot.lastError,
      joinChannel: (channelId: ChannelId) => manager.joinChannel(channelId),
      leaveChannel: (channelId: ChannelId) => manager.leaveChannel(channelId),
    }),
    [manager, snapshot.lastError, snapshot.socket, snapshot.status],
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
