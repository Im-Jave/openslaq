import { z } from "@hono/zod-openapi";

export const createDmSchema = z.object({
  userId: z.string().min(1),
});
