import { z } from "@hono/zod-openapi";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
