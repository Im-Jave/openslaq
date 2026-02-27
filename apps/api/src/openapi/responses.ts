import type { Context } from "hono";
import type { TypedResponse } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function jsonResponse<T, S extends ContentfulStatusCode>(c: Context, body: T, status: S): TypedResponse<T, S, "json"> {
  return c.json(body, status) as unknown as TypedResponse<T, S, "json">;
}

export function jsonOk<S extends 200 | 201>(c: Context, status: S = 200 as S): TypedResponse<{ ok: true }, S, "json"> {
  return c.json({ ok: true as const }, status) as TypedResponse<{ ok: true }, S, "json">;
}

export function redirectResponse(c: Context, url: string, status: 301 | 302 | 307 | 308 = 302) {
  return c.redirect(url, status);
}
