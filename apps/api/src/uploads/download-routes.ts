import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getAttachmentById, getDownloadUrl } from "./service";
import { errorSchema } from "../openapi/schemas";

const downloadRoute = createRoute({
  method: "get",
  path: "/uploads/:id/download",
  tags: ["Uploads"],
  summary: "Download file",
  description: "Redirects to a pre-signed download URL for the attachment.",
  request: {
    params: z.object({ id: z.string().describe("Attachment ID") }),
  },
  responses: {
    302: { description: "Redirect to download URL" },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Attachment not found",
    },
  },
});

const app = new OpenAPIHono().openapi(downloadRoute, async (c) => {
  const { id } = c.req.valid("param");
  const attachment = await getAttachmentById(id);

  if (!attachment) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const url = getDownloadUrl(attachment.storageKey);
  return c.redirect(url, 302) as any;
});

export default app;
