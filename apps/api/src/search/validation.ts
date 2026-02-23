import { z } from "@hono/zod-openapi";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  channelId: z.string().uuid().optional(),
  userId: z.string().min(1).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
