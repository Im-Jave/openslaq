import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "osb_";

export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString("base64url");
  const token = `${TOKEN_PREFIX}${raw}`;
  const hash = hashToken(token);
  const prefix = token.slice(0, TOKEN_PREFIX.length + 8);
  return { token, hash, prefix };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
