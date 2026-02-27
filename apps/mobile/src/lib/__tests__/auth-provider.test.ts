import { AuthError } from "@openslaq/client-core";

jest.mock("../token-store", () => ({
  getTokens: jest.fn(),
  storeTokens: jest.fn(),
}));

jest.mock("../stack-auth", () => ({
  refreshAccessToken: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

import { router } from "expo-router";
import { getTokens, storeTokens } from "../token-store";
import { refreshAccessToken } from "../stack-auth";
import { createMobileAuthProvider, setAuthToken } from "../auth-provider";

const getTokensMock = getTokens as jest.Mock;
const storeTokensMock = storeTokens as jest.Mock;
const refreshAccessTokenMock = refreshAccessToken as jest.Mock;
const replaceMock = (router as unknown as { replace: jest.Mock }).replace;

describe("auth-provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthToken(null);
  });

  it("returns a cached token without reading storage", async () => {
    setAuthToken("cached-token");
    const authProvider = createMobileAuthProvider();

    await expect(authProvider.getAccessToken()).resolves.toBe("cached-token");
    expect(getTokensMock).not.toHaveBeenCalled();
  });

  it("returns null when no tokens are stored", async () => {
    getTokensMock.mockResolvedValue(null);
    const authProvider = createMobileAuthProvider();

    await expect(authProvider.getAccessToken()).resolves.toBeNull();
  });

  it("refreshes and stores tokens from refresh token", async () => {
    getTokensMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    refreshAccessTokenMock.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
      user_id: "user-1",
    });
    const authProvider = createMobileAuthProvider();

    await expect(authProvider.getAccessToken()).resolves.toBe("new-access");
    await expect(authProvider.getAccessToken()).resolves.toBe("new-access");

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith("refresh-1");
    expect(storeTokensMock).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      userId: "user-1",
    });
  });

  it("returns null when refresh fails", async () => {
    getTokensMock.mockResolvedValue({
      accessToken: "old-access",
      refreshToken: "refresh-1",
      userId: "user-1",
    });
    refreshAccessTokenMock.mockRejectedValue(new Error("refresh failed"));
    const authProvider = createMobileAuthProvider();

    await expect(authProvider.getAccessToken()).resolves.toBeNull();
  });

  it("throws when requireAccessToken has no valid token", async () => {
    getTokensMock.mockResolvedValue(null);
    const authProvider = createMobileAuthProvider();

    await expect(authProvider.requireAccessToken()).rejects.toBeInstanceOf(AuthError);
    await expect(authProvider.requireAccessToken()).rejects.toThrow("No valid token available");
  });

  it("runs custom onAuthRequired callback and clears cached token", async () => {
    setAuthToken("cached-token");
    const onAuthRequired = jest.fn();
    const authProvider = createMobileAuthProvider(onAuthRequired);

    authProvider.onAuthRequired();
    await expect(authProvider.getAccessToken()).resolves.toBeNull();

    expect(onAuthRequired).toHaveBeenCalledTimes(1);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when no onAuthRequired callback is passed", () => {
    const authProvider = createMobileAuthProvider();

    authProvider.onAuthRequired();

    expect(replaceMock).toHaveBeenCalledWith("/(auth)/sign-in");
  });
});
