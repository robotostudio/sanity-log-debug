import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
    R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
    R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
    R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  },
  experimental__runtimeEnv: process.env,
  // Skip validation during build if env vars aren't available
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
