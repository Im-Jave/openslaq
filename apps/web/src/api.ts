import { createApiClient } from "@openslaq/client-core";
import { env } from "./env";

// Hono RPC client — fully typed API calls with zero codegen
export const api = createApiClient(env.VITE_API_URL);
