import { hc } from "hono/client";
import type { AppType } from "@openslack/api/app";
import { env } from "./env";

// Hono RPC client — fully typed API calls with zero codegen
export const api = hc<AppType>(env.VITE_API_URL);
