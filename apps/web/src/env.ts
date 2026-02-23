function required(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  VITE_API_URL: required("VITE_API_URL"),
  VITE_STACK_PROJECT_ID: required("VITE_STACK_PROJECT_ID"),
  VITE_STACK_PUBLISHABLE_CLIENT_KEY: required(
    "VITE_STACK_PUBLISHABLE_CLIENT_KEY",
  ),
} as const;
