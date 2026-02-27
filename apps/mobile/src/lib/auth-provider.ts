import type { AuthProvider } from "@openslaq/client-core";
import { AuthError } from "@openslaq/client-core";
import { getTokens, storeTokens } from "./token-store";
import { refreshAccessToken } from "./stack-auth";
import { router } from "expo-router";

let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
}

async function getValidToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  const tokens = await getTokens();
  if (!tokens) return null;

  // Try to refresh the token
  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    const newToken = refreshed.access_token;
    await storeTokens({
      accessToken: newToken,
      refreshToken: refreshed.refresh_token,
      userId: refreshed.user_id,
    });
    cachedToken = newToken;
    return newToken;
  } catch {
    return null;
  }
}

export function createMobileAuthProvider(
  onAuthRequired?: () => void,
): AuthProvider {
  return {
    getAccessToken: () => getValidToken(),
    requireAccessToken: async () => {
      const token = await getValidToken();
      if (!token) throw new AuthError("No valid token available");
      return token;
    },
    onAuthRequired: () => {
      cachedToken = null;
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        router.replace("/(auth)/sign-in");
      }
    },
  };
}
