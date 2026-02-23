import type { Server } from "socket.io";
import * as jose from "jose";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@openslack/shared";
import { asUserId, asChannelId } from "@openslack/shared";
import { jwks, jwtVerifyOptions, e2eTestSecret } from "../auth/jwt";
import { db } from "../db";
import { channelMembers } from "../channels/schema";
import { isChannelMember } from "../channels/service";
import { workspaceMembers } from "../workspaces/schema";
import { users } from "../users/schema";
import {
  addSocket,
  removeSocket,
  getOnlineUserIds,
  persistLastSeen,
  getUserWorkspaceIds,
  getSocketIdsForUser,
} from "../presence/service";
import {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  setMuted,
  getActiveHuddlesForChannels,
  removeUserFromAllHuddles,
} from "../huddle/service";

const socketJwtSchema = z.object({ sub: z.string() });

const typingTimestamps = new Map<string, number>();

export function setupSocketHandlers(
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >,
) {
  // Authenticate on connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      // Try HMAC first when e2e secret is configured (avoids network call)
      if (e2eTestSecret) {
        try {
          const { payload } = await jose.jwtVerify(token, e2eTestSecret);
          const parsed = socketJwtSchema.parse(payload);
          socket.data.userId = asUserId(parsed.sub);
          return next();
        } catch {
          // Not an HMAC token — fall through to JWKS
        }
      }
      const { payload } = await jose.jwtVerify(token, jwks, jwtVerifyOptions);
      const parsed = socketJwtSchema.parse(payload);
      socket.data.userId = asUserId(parsed.sub);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    console.log(`Socket connected: ${userId}`);

    let workspaceIds: string[] = [];

    try {
      // Auto-join all channels the user is a member of
      const memberships = await db
        .select({ channelId: channelMembers.channelId })
        .from(channelMembers)
        .where(eq(channelMembers.userId, userId));
      for (const { channelId } of memberships) {
        socket.join(`channel:${channelId}`);
      }

      // Join workspace rooms for presence broadcasts
      workspaceIds = await getUserWorkspaceIds(userId);
      for (const wsId of workspaceIds) {
        socket.join(`workspace:${wsId}`);
      }

      // Track presence
      const cameOnline = addSocket(userId, socket.id);
      if (cameOnline) {
        for (const wsId of workspaceIds) {
          io.to(`workspace:${wsId}`).emit("presence:updated", {
            userId,
            status: "online",
            lastSeenAt: null,
          });
        }
      }

      // Send presence snapshot to connecting client
      const workspaceMemberRows = await db
        .select({
          userId: workspaceMembers.userId,
          lastSeenAt: users.lastSeenAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(
          workspaceIds.length > 0
            ? eq(workspaceMembers.workspaceId, workspaceIds[0]!)
            : eq(workspaceMembers.workspaceId, ""),
        );

      const onlineIds = getOnlineUserIds();
      socket.emit("presence:sync", {
        users: workspaceMemberRows.map((m) => ({
          userId: m.userId,
          status: (onlineIds.has(m.userId) ? "online" : "offline") as "online" | "offline",
          lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
        })),
      });

      // Send active huddles for user's channels
      const channelIds = memberships.map((m) => m.channelId);
      const activeHuddles = getActiveHuddlesForChannels(channelIds);
      if (activeHuddles.length > 0) {
        socket.emit("huddle:sync", { huddles: activeHuddles });
      }
    } catch (err) {
      console.error(`Socket connection init failed for ${userId}:`, err);
      socket.disconnect(true);
      return;
    }

    socket.on("channel:join", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;
      socket.join(`channel:${channelId}`);
    });

    socket.on("channel:leave", ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("message:typing", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;

      const throttleKey = `${userId}:${channelId}`;
      const now = Date.now();
      const last = typingTimestamps.get(throttleKey);
      if (last && now - last < 3000) return;
      typingTimestamps.set(throttleKey, now);

      socket.to(`channel:${channelId}`).emit("user:typing", {
        userId,
        channelId,
      });
    });

    socket.on("huddle:start", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;
      const huddle = startHuddle(channelId, userId);
      io.to(`channel:${channelId}`).emit("huddle:started", huddle);
    });

    socket.on("huddle:join", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;
      const huddle = joinHuddle(channelId, userId);
      io.to(`channel:${channelId}`).emit("huddle:updated", huddle);
    });

    socket.on("huddle:leave", () => {
      const result = leaveHuddle(userId);
      if (result.channelId) {
        if (result.ended) {
          io.to(`channel:${result.channelId}`).emit("huddle:ended", {
            channelId: result.channelId,
          });
        } else if (result.huddle) {
          io.to(`channel:${result.channelId}`).emit("huddle:updated", result.huddle);
        }
      }
    });

    socket.on("huddle:mute", ({ isMuted }) => {
      const huddle = setMuted(userId, isMuted);
      if (huddle) {
        io.to(`channel:${huddle.channelId}`).emit("huddle:updated", huddle);
      }
    });

    socket.on("webrtc:offer", (payload) => {
      const targetSockets = getSocketIdsForUser(payload.toUserId);
      const offer = { ...payload, fromUserId: userId };
      for (const sid of targetSockets) {
        io.to(sid).emit("webrtc:offer", offer);
      }
    });

    socket.on("webrtc:answer", (payload) => {
      const targetSockets = getSocketIdsForUser(payload.toUserId);
      const answer = { ...payload, fromUserId: userId };
      for (const sid of targetSockets) {
        io.to(sid).emit("webrtc:answer", answer);
      }
    });

    socket.on("webrtc:ice-candidate", (payload) => {
      const targetSockets = getSocketIdsForUser(payload.toUserId);
      const candidate = { ...payload, fromUserId: userId };
      for (const sid of targetSockets) {
        io.to(sid).emit("webrtc:ice-candidate", candidate);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${userId}`);
      const wentOffline = removeSocket(userId, socket.id);

      // Only clean up huddle when user goes fully offline (no remaining sockets)
      if (wentOffline) {
        const huddleResult = removeUserFromAllHuddles(userId);
        if (huddleResult.channelId) {
          if (huddleResult.ended) {
            io.to(`channel:${huddleResult.channelId}`).emit("huddle:ended", {
              channelId: huddleResult.channelId,
            });
          } else if (huddleResult.huddle) {
            io.to(`channel:${huddleResult.channelId}`).emit(
              "huddle:updated",
              huddleResult.huddle,
            );
          }
        }

        await persistLastSeen(userId);
        const now = new Date().toISOString();
        for (const wsId of workspaceIds) {
          io.to(`workspace:${wsId}`).emit("presence:updated", {
            userId,
            status: "offline",
            lastSeenAt: now,
          });
        }
      }
    });
  });

  return io;
}
