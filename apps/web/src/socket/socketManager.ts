import type { ChannelId } from "@openslack/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@openslack/shared";
import { io, type Socket } from "socket.io-client";
import { env } from "../env";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface SocketSnapshot {
  socket: TypedSocket | null;
  status: SocketStatus;
  lastError: string | null;
}

type SnapshotListener = (snapshot: SocketSnapshot) => void;
type TokenProvider = () => Promise<string | null>;

interface SocketManagerOptions {
  createSocket?: () => TypedSocket;
}

export class SocketManager {
  private socket: TypedSocket | null = null;
  private status: SocketStatus = "idle";
  private lastError: string | null = null;
  private desiredChannels = new Set<ChannelId>();
  private snapshotListeners = new Set<SnapshotListener>();
  private connectAttempt = 0;
  private intentionallyDisconnected = true;
  private readonly createSocket: () => TypedSocket;

  constructor(options: SocketManagerOptions = {}) {
    this.createSocket =
      options.createSocket ??
      (() =>
        io(env.VITE_API_URL, {
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
        }));
  }

  subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  getSnapshot(): SocketSnapshot {
    return {
      socket: this.socket,
      status: this.status,
      lastError: this.lastError,
    };
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }

  async connect(tokenProvider: TokenProvider): Promise<void> {
    const attempt = ++this.connectAttempt;
    this.intentionallyDisconnected = false;
    this.updateStatus("connecting", null);

    const token = await tokenProvider();
    if (attempt !== this.connectAttempt || !token) {
      if (!token) {
        this.updateStatus("error", "Missing access token");
      }
      return;
    }

    const socket = this.ensureSocket();
    socket.auth = { token };
    socket.connect();
  }

  disconnectForLogout(): void {
    this.connectAttempt += 1;
    this.intentionallyDisconnected = true;
    this.desiredChannels.clear();

    if (this.socket) {
      this.socket.disconnect();
    }

    this.updateStatus("idle", null);
  }

  destroy(): void {
    this.disconnectForLogout();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.io.removeAllListeners();
    }
    this.socket = null;
    this.emitSnapshot();
  }

  joinChannel(channelId: ChannelId): void {
    this.desiredChannels.add(channelId);

    if (this.socket?.connected) {
      this.socket.emit("channel:join", { channelId });
    }
  }

  leaveChannel(channelId: ChannelId): void {
    this.desiredChannels.delete(channelId);

    if (this.socket?.connected) {
      this.socket.emit("channel:leave", { channelId });
    }
  }

  private ensureSocket(): TypedSocket {
    if (this.socket) return this.socket;

    const socket = this.createSocket();

    socket.on("connect", () => {
      this.updateStatus("connected", null);
      for (const channelId of this.desiredChannels) {
        socket.emit("channel:join", { channelId });
      }
    });

    socket.on("connect_error", (error: Error) => {
      this.updateStatus("error", error.message || "Socket connection error");
    });

    socket.on("disconnect", (reason: string) => {
      if (reason === "io client disconnect" || this.intentionallyDisconnected) {
        this.updateStatus("disconnected", null);
        return;
      }
      this.updateStatus("reconnecting", this.lastError);
    });

    socket.io.on("reconnect_attempt", () => {
      if (!this.intentionallyDisconnected) {
        this.updateStatus("reconnecting", this.lastError);
      }
    });

    this.socket = socket;
    this.emitSnapshot();
    return socket;
  }

  private updateStatus(status: SocketStatus, lastError: string | null): void {
    this.status = status;
    this.lastError = lastError;
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }
}
