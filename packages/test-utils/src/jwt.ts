import * as jose from "jose";
import { E2E_TEST_SECRET, ISSUER, PROJECT_ID } from "./constants";
import type { TestUser } from "./types";

export async function signTestJwt(user: TestUser): Promise<string> {
  const secret = new TextEncoder().encode(E2E_TEST_SECRET);
  return await new jose.SignJWT({
    email: user.email,
    name: user.displayName,
    email_verified: user.emailVerified,
    project_id: PROJECT_ID,
    branch_id: "main",
    refresh_token_id: `e2e-rt-${user.id}`,
    role: "authenticated",
    selected_team_id: null,
    is_anonymous: false,
    is_restricted: false,
    restricted_reason: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(PROJECT_ID)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}
