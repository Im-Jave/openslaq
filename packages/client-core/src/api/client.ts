import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

export function createApiClient(apiUrl: string) {
  return hc<AppType>(apiUrl);
}

export type ApiClient = ReturnType<typeof createApiClient>;
