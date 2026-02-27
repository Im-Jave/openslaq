import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { canAccessAttachment, getAttachmentById, getDownloadUrl } from "./service";
import { rlRead } from "../rate-limit";
import { errorSchema } from "../openapi/schemas";
import { redirectResponse } from "../openapi/responses";

const downloadRoute = createRoute({
  method: "get",
  path: "/uploads/:id/download",
  tags: ["Uploads"],
  summary: "Download file",
  description: "Redirects to a pre-signed download URL for the attachment.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead] as const,
  request: {
    params: z.object({ id: z.string().describe("Attachment ID") }),
  },
  responses: {
    302: { description: "Redirect to download URL" },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Attachment not found",
    },
  },
});

const app = new OpenAPIHono().openapi(downloadRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const attachment = await getAttachmentById(id);

  if (!attachment) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const canAccess = await canAccessAttachment(attachment, user.id);
  if (!canAccess) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const url = getDownloadUrl(attachment.storageKey);
  return redirectResponse(c, url, 302);
});

export default app;
