import { z } from "@hono/zod-openapi";

export const createInviteSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresInHours: z.number().positive().optional().default(168), // 7 days
});
