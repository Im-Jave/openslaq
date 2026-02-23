import { useContext } from "react";
import { SocketContext, type SocketContextValue } from "../socket/SocketProvider";

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
