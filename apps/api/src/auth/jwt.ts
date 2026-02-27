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

// HMAC secret for e2e tests — only active in development/test
const isDevOrTest = process.env.NODE_ENV !== "production";

export const e2eTestSecret = (() => {
  if (!env.E2E_TEST_SECRET) return null;

  if (!isDevOrTest) {
    console.warn(
      "WARNING: E2E_TEST_SECRET is set in production. HMAC auth bypass is disabled in production mode.",
    );
    return null;
  }

  return new TextEncoder().encode(env.E2E_TEST_SECRET);
})();
