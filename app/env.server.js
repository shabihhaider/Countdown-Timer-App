import { z } from "zod";

const envSchema = z.object({
  // Required — app crashes without these
  SHOPIFY_API_KEY: z.string().min(1, "SHOPIFY_API_KEY is required"),
  SHOPIFY_API_SECRET: z.string().min(1, "SHOPIFY_API_SECRET is required"),
  SHOPIFY_APP_URL: z.string().url("SHOPIFY_APP_URL must be a valid URL"),
  DATABASE_URL: z
    .string()
    .startsWith("postgresql://", "DATABASE_URL must be a PostgreSQL connection string"),
  DIRECT_URL: z
    .string()
    .startsWith("postgresql://", "DIRECT_URL must be a PostgreSQL connection string"),

  // Optional with defaults
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  REDIS_URL: z.string().optional(),
  SCOPES: z.string().default("write_themes"),
  HMR_SERVER_PORT: z.coerce.number().default(8002),
  SHOP_CUSTOM_DOMAIN: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("\n[FATAL] Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCheck your .env file or environment configuration.\n");

    if (process.env.NODE_ENV === "test") {
      // Don't crash during tests — let individual tests handle env
      return envSchema.parse({
        ...process.env,
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "test_key",
        SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET || "test_secret",
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "http://localhost:3000",
        DATABASE_URL:
          process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/test",
        DIRECT_URL: process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/test",
      });
    }

    process.exit(1);
  }

  // Warn if Redis is missing in production (rate limiter won't work)
  if (result.data.NODE_ENV === "production" && !result.data.REDIS_URL) {
    console.warn(
      "[WARN] REDIS_URL not set in production — rate limiting will be ineffective on serverless"
    );
  }

  return result.data;
}

export const env = validateEnv();
