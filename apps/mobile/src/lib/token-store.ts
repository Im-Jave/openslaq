import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "openslaq_access_token";
const REFRESH_TOKEN_KEY = "openslaq_refresh_token";
const USER_ID_KEY = "openslaq_user_id";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken, userId] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(USER_ID_KEY),
  ]);
  if (!accessToken || !refreshToken || !userId) return null;
  return { accessToken, refreshToken, userId };
}

export async function storeTokens(tokens: StoredTokens): Promise<void> {
  if (!tokens.accessToken || !tokens.refreshToken || !tokens.userId) {
    throw new Error(
      `storeTokens: all fields must be non-empty strings, got: accessToken=${typeof tokens.accessToken}, refreshToken=${typeof tokens.refreshToken}, userId=${typeof tokens.userId}`,
    );
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(USER_ID_KEY, tokens.userId),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_ID_KEY),
  ]);
}
