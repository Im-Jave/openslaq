import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { apiReference } from "@scalar/hono-api-reference";
import { env } from "./env";
import { artificialDelay } from "./middleware/artificial-delay";
import workspaceRoutes from "./workspaces/routes";
import workspaceScopedRoutes from "./workspaces/scoped-routes";
import inviteAcceptRoutes from "./workspaces/invite-accept-routes";
import messageRoutes from "./messages/routes";
import userRoutes from "./users/routes";
import uploadDownloadRoutes from "./uploads/download-routes";
import uploadRoutes from "./uploads/routes";
import reactionRoutes from "./reactions/routes";
import adminRoutes from "./admin/routes";
import rateLimitTestRoutes from "./rate-limit/test-routes";

const app = new OpenAPIHono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/api/*", artificialDelay);

// OpenAPI spec setup (must be done before chaining .route() which narrows the type)
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Stack Auth JWT token",
});

app.doc31("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "OpenSlack API",
    version: "1.0.0",
    description: "Real-time messaging platform API",
  },
  tags: [
    { name: "Users", description: "User profile management" },
    { name: "Workspaces", description: "Workspace CRUD operations" },
    { name: "Channels", description: "Channel management" },
    { name: "Messages", description: "Message CRUD and threading" },
    { name: "Reactions", description: "Emoji reactions" },
    { name: "Uploads", description: "File uploads and downloads" },
    { name: "DMs", description: "Direct messages" },
    { name: "Invites", description: "Workspace invitations" },
    { name: "Search", description: "Full-text message search" },
    { name: "Presence", description: "User online presence" },
  ],
});

app.get("/api/docs", apiReference({ url: "/api/openapi.json", theme: "kepler" }));

// Route mounting (chained for AppType inference)
const routes = app
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  .route("/api/test", env.E2E_TEST_SECRET ? rateLimitTestRoutes : new Hono())
  .route("/api", uploadDownloadRoutes)
  .route("/api/workspaces", workspaceRoutes)
  .route("/api/workspaces/:slug", workspaceScopedRoutes)
  .route("/api/invites", inviteAcceptRoutes)
  .route("/api", messageRoutes)
  .route("/api", uploadRoutes)
  .route("/api", reactionRoutes)
  .route("/api/users", userRoutes)
  .route("/api/admin", adminRoutes);

// Export the app type for Hono RPC client (end-to-end type safety)
export type AppType = typeof routes;

export default app;
