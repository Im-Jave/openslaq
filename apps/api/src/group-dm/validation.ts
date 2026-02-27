import { z } from "@hono/zod-openapi";

export const createGroupDmSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(2).max(8),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
});

export const renameGroupDmSchema = z.object({
  displayName: z.string().min(1).max(100),
});
