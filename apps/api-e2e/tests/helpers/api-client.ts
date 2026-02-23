import { hc } from "hono/client";
import * as jose from "jose";
import type { AppType } from "@openslack/api/app";

const E2E_TEST_SECRET = "openslack-e2e-test-secret-do-not-use-in-prod";
const PROJECT_ID = "924565c5-6377-44b7-aa75-6b7de8d311f4";
const STACK_AUTH_BASE = "https://api.stack-auth.com/api/v1";
const ISSUER = `${STACK_AUTH_BASE}/projects/${PROJECT_ID}`;

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

export interface TestUser {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
}

const defaultUser: TestUser = {
  id: "api-e2e-user-001",
  displayName: "API E2E User",
  email: "api-e2e@openslack.dev",
  emailVerified: true,
};

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

export async function createTestClient(overrides?: Partial<TestUser>) {
  const user: TestUser = { ...defaultUser, ...overrides };
  const token = await signTestJwt(user);
  const headers = { Authorization: `Bearer ${token}` };
  const client = hc<AppType>(BASE_URL, { headers });
  return { client, headers, user };
}

/** Short random string for unique test data */
export function testId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Create an isolated workspace for testing, returns the workspace and slug */
export async function createTestWorkspace(client: ReturnType<typeof hc<AppType>>) {
  const res = await client.api.workspaces.$post({
    json: { name: `Test Workspace ${testId()}` },
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create test workspace: ${res.status}`);
  }
  const workspace = (await res.json()) as { id: string; name: string; slug: string };
  return workspace;
}

/** Add a user to a workspace via invite flow */
export async function addToWorkspace(
  ownerClient: ReturnType<typeof hc<AppType>>,
  slug: string,
  joinerClient: ReturnType<typeof hc<AppType>>,
) {
  const inviteRes = await ownerClient.api.workspaces[":slug"].invites.$post({
    param: { slug },
    json: {},
  });
  if (inviteRes.status !== 201) {
    throw new Error(`Failed to create invite: ${inviteRes.status}`);
  }
  const invite = (await inviteRes.json()) as { code: string };

  const acceptRes = await joinerClient.api.invites[":code"].accept.$post({
    param: { code: invite.code },
  });
  if (acceptRes.status !== 200) {
    throw new Error(`Failed to accept invite: ${acceptRes.status}`);
  }
}
