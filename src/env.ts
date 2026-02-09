import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
    R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
    R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
    R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine(
        (url) => {
          // Allow postgres:// and postgresql:// connection strings
          return /^postgres(ql)?:\/\/.+/.test(url);
        },
        {
          message: "DATABASE_URL must be a valid PostgreSQL connection string",
        },
      ),
    // Auth
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
    GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
    GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  },
  experimental__runtimeEnv: process.env,
  // Skip validation during build if env vars aren't available
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
