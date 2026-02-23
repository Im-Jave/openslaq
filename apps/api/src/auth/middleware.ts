import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { z } from "zod";
import { asUserId } from "@openslack/shared";
import { jwks, jwtVerifyOptions, e2eTestSecret } from "./jwt";
import { upsertUser } from "../users/service";
import type { AuthEnv } from "./types";

const jwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  name: z.string().nullish(),
});

async function verifyAndExtract(token: string) {
  // Try HMAC first when e2e secret is configured (avoids network call)
  if (e2eTestSecret) {
    try {
      const { payload } = await jose.jwtVerify(token, e2eTestSecret);
      return payload;
    } catch {
      // Not an HMAC token — fall through to JWKS
    }
  }

  const { payload } = await jose.jwtVerify(token, jwks, jwtVerifyOptions);
  return payload;
}

export const auth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAndExtract(token);
    const parsed = jwtPayloadSchema.parse(payload);

    const userId = parsed.sub;
    const email = parsed.email;
    const displayName = parsed.name ?? email;

    await upsertUser(userId, email, displayName);

    c.set("user", { id: asUserId(userId), email, displayName });
    await next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return c.json({ error: "Invalid token" }, 401);
  }
});
