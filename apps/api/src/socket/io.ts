import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@openslack/shared";

type IO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

let ioInstance: IO | null = null;

export function setIO(io: IO) {
  ioInstance = io;
}

export function getIO(): IO {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized — call setIO() first");
  }
  return ioInstance;
}
