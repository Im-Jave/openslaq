import * as SecureStore from "expo-secure-store";
import { clearTokens, getTokens, storeTokens } from "../token-store";

describe("token-store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when any token value is missing", async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("access")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("user-1");

    await expect(getTokens()).resolves.toBeNull();
  });

  it("returns all stored tokens when present", async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("access")
      .mockResolvedValueOnce("refresh")
      .mockResolvedValueOnce("user-1");

    await expect(getTokens()).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      userId: "user-1",
    });
  });

  it("stores all token fields", async () => {
    await storeTokens({
      accessToken: "access",
      refreshToken: "refresh",
      userId: "user-1",
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(3);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("openslaq_access_token", "access");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("openslaq_refresh_token", "refresh");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("openslaq_user_id", "user-1");
  });

  it("clears all stored token fields", async () => {
    await clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("openslaq_access_token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("openslaq_refresh_token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("openslaq_user_id");
  });

  it("throws when any token field is undefined or empty", async () => {
    await expect(
      storeTokens({ accessToken: "a", refreshToken: "r", userId: "" } as any),
    ).rejects.toThrow("storeTokens: all fields must be non-empty strings");

    await expect(
      storeTokens({ accessToken: "a", refreshToken: "r", userId: undefined } as any),
    ).rejects.toThrow("storeTokens: all fields must be non-empty strings");

    await expect(
      storeTokens({ accessToken: "", refreshToken: "r", userId: "u" } as any),
    ).rejects.toThrow("storeTokens: all fields must be non-empty strings");

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
