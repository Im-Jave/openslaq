import * as jose from "jose";
import { env } from "../env";

const projectId = env.VITE_STACK_PROJECT_ID;

export const jwks = jose.createRemoteJWKSet(
  new URL(
    `https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.json`,
  ),
  { timeoutDuration: 5000 },
);

export const jwtVerifyOptions = {
  issuer: `https://api.stack-auth.com/api/v1/projects/${projectId}`,
  audience: projectId,
};

// HMAC secret for e2e tests — only active when E2E_TEST_SECRET is set
export const e2eTestSecret = env.E2E_TEST_SECRET
  ? new TextEncoder().encode(env.E2E_TEST_SECRET)
  : null;
