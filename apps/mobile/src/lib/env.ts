export const env = {
  EXPO_PUBLIC_API_URL:
    process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
  EXPO_PUBLIC_WEB_URL:
    process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000",
  EXPO_PUBLIC_STACK_PROJECT_ID:
    process.env.EXPO_PUBLIC_STACK_PROJECT_ID ?? "",
  EXPO_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY:
    process.env.EXPO_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ?? "",
};
