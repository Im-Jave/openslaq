import type { ReactNode } from "react";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@stackframe/react";
import type { ChannelId } from "@openslack/shared";
import {
  SocketManager,
  type SocketSnapshot,
  type SocketStatus,
  type TypedSocket,
} from "./socketManager";

export interface SocketContextValue extends SocketSnapshot {
  joinChannel: (channelId: ChannelId) => void;
  leaveChannel: (channelId: ChannelId) => void;
}

const defaultSnapshot: SocketSnapshot = {
  socket: null,
  status: "idle",
  lastError: null,
};

export const SocketContext = createContext<SocketContextValue>({
  ...defaultSnapshot,
  joinChannel: () => {},
  leaveChannel: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const user = useUser();
  const managerRef = useRef<SocketManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new SocketManager();
  }
  const manager = managerRef.current;

  const [snapshot, setSnapshot] = useState<SocketSnapshot>(defaultSnapshot);

  useEffect(() => manager.subscribe(setSnapshot), [manager]);

  useEffect(() => {
    if (!user) {
      manager.disconnectForLogout();
      return;
    }

    void manager.connect(async () => {
      const authJson = await user.getAuthJson();
      return authJson.accessToken ?? null;
    });
  }, [manager, user]);

  useEffect(
    () => () => {
      manager.destroy();
    },
    [manager],
  );

  const contextValue = useMemo(
    () => ({
      socket: snapshot.socket as TypedSocket | null,
      status: snapshot.status as SocketStatus,
      lastError: snapshot.lastError,
      joinChannel: (channelId: ChannelId) => manager.joinChannel(channelId),
      leaveChannel: (channelId: ChannelId) => manager.leaveChannel(channelId),
    }),
    [manager, snapshot.lastError, snapshot.socket, snapshot.status],
  );

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}
