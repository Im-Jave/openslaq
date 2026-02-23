import { createAdaptorServer } from "@hono/node-server";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@openslack/shared";
import app from "./app";
import { setupSocketHandlers } from "./socket";
import { setIO } from "./socket/io";
import { env } from "./env";
import { startCleanup } from "./rate-limit";

// Use Node.js HTTP server for Socket.IO compatibility
const httpServer = createAdaptorServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

setupSocketHandlers(io);
setIO(io);

const port = env.PORT ?? env.API_PORT;
httpServer.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
  startCleanup();
});
