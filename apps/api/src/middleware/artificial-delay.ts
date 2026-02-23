import { createMiddleware } from "hono/factory";
import { env } from "../env";

export function createArtificialDelayMiddleware(delayMs: number) {
  return createMiddleware(async (_c, next) => {
    if (delayMs > 0) {
      await Bun.sleep(delayMs);
    }
    await next();
  });
}

export const artificialDelay = createArtificialDelayMiddleware(env.API_ARTIFICIAL_DELAY_MS);
