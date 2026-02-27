import { createApiClient } from "@openslaq/client-core";
import { env } from "./env";

export const api = createApiClient(env.EXPO_PUBLIC_API_URL);
