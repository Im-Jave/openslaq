import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  VITE_STACK_PROJECT_ID: z.string(),
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(3001),
  API_ARTIFICIAL_DELAY_MS: z.coerce.number().int().nonnegative().default(0),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  E2E_TEST_SECRET: z.string().optional(),
  ADMIN_USER_IDS: z.string().default(""),
  STACK_SECRET_SERVER_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
