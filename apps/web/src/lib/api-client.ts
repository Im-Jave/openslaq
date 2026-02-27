import { useMemo } from "react";
import type { AuthProvider } from "@openslaq/client-core";
import {
  authorizedHeaders as coreAuthorizedHeaders,
  authorizedRequest as coreAuthorizedRequest,
} from "@openslaq/client-core";
import { requireAccessToken, redirectToAuth } from "./auth";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface AuthJsonUser {
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

type AuthUser = AuthJsonUser | null | undefined;

export function toAuthProvider(user: AuthUser): AuthProvider {
  return {
    getAccessToken: async () => {
      if (!user) return null;
      const authJson = await user.getAuthJson();
      return authJson.accessToken ?? null;
    },
    requireAccessToken: () => requireAccessToken(user),
    onAuthRequired: () => {
      void redirectToAuth();
    },
  };
}

export function useAuthProvider(): AuthProvider {
  const user = useCurrentUser();
  return useMemo(() => toAuthProvider(user), [user]);
}

export async function authorizedHeaders(user: AuthUser): Promise<{ Authorization: string }> {
  return coreAuthorizedHeaders(toAuthProvider(user));
}

export async function authorizedRequest(
  user: AuthUser,
  request: (headers: { Authorization: string }) => Promise<Response>,
): Promise<Response> {
  return coreAuthorizedRequest(toAuthProvider(user), request);
}
