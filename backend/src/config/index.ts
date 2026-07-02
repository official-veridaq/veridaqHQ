/**
 * Centralised, Zod-validated environment configuration.
 * The server will not start if any required variable is missing or malformed.
 * This prevents silent misconfiguration in any environment.
 */

import "dotenv/config"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { z } from "zod"

// Workspace root — resolves .env-relative paths (circuits, etc.)
// This file is at backend/src/config/index.ts, so we go up 3 levels to reach root.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1000).max(65535).default(4000),
  FRONTEND_URL: z.string().url(),
  BACKEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_SECRET: z.string().min(32),
  REFRESH_EXPIRES_IN: z.string().default("7d"),
  EXTENSION_JWT_EXPIRES_IN: z.string().default("5m"),

  STELLAR_RPC_URL: z.string().url(),
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1),

  INSTITUTION_REGISTRY_ID: z.string().optional(),
  CREDENTIAL_REGISTRY_ID: z.string().optional(),
  REVOCATION_REGISTRY_ID: z.string().optional(),
  ZK_VERIFIER_ID: z.string().optional(),

  PLATFORM_ADMIN_SECRET_KEY: z.string().min(56).optional(),
  PLATFORM_ADMIN_PUBLIC_KEY: z.string().optional(),

  CIRCUIT_ZKEY_PATH: z.string().min(1).transform(p => resolve(ROOT, p)),
  CIRCUIT_WASM_PATH: z.string().min(1).transform(p => resolve(ROOT, p)),
  VERIFICATION_KEY_PATH: z.string().min(1).default("packages/circuits/build/verification_key.json").transform(p => resolve(ROOT, p)),

  // Must be exactly 64 hex characters (32 bytes)
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex chars"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  XLM_ASSET_ID: z.string().optional(),

  EXTENSION_ORIGINS: z.string().optional(),

  CROSSMINT_SERVER_API_KEY: z.string().optional(),
  CROSSMINT_WEBHOOK_SECRET: z.string().optional(),

  USE_MOCK_BLOCKCHAIN: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const msg = `Environment variable validation failed:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}`
  if (process.env.NODE_ENV === "test") {
    throw new Error(msg)
  }
  console.error(msg)
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
