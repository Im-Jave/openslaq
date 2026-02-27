import { z } from "@hono/zod-openapi";

export const createMessageSchema = z
  .object({
    content: z.string().max(10000).default(""),
    attachmentIds: z.array(z.string().uuid()).max(10).optional().default([]),
  })
  .refine((data) => data.content.trim().length > 0 || data.attachmentIds.length > 0, {
    message: "Message must have content or attachments",
  });

export const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const shareMessageSchema = z.object({
  sharedMessageId: z.string().uuid(),
  comment: z.string().max(10000).default(""),
});

export const messagesPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  direction: z.enum(["older", "newer"]).default("older"),
});

export type CreateMessage = z.infer<typeof createMessageSchema>;
export type EditMessage = z.infer<typeof editMessageSchema>;
export type MessagesPagination = z.infer<typeof messagesPaginationSchema>;
