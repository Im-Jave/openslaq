import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const activityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});
