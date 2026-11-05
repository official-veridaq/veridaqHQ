import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

const root = __dirname // backend/

export default defineConfig({
  resolve: {
    alias: {
      // Redirect blockchain service imports to the mock during tests so we
      // never attempt real RPC calls or private-key operations.
      "./blockchain.service.js": resolve(root, "src/test/mocks/blockchain.service.ts"),
      "../services/blockchain.service.js": resolve(
        root,
        "src/test/mocks/blockchain.service.ts"
      ),
    },
  },
  test: {
    env: {
      NODE_ENV: "test",
      FRONTEND_URL: "http://localhost:3000",
      BACKEND_URL: "http://localhost:4000",
      // Honour DATABASE_URL when the runner exports one (CI provides the
      // postgres service credentials). Only fall back to the local default
      // when it is unset, so a clean checkout still works.
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/veridaq_test",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379/1",
      JWT_SECRET: process.env.JWT_SECRET ?? "test_jwt_secret_key_min_32_chars_long_for_sure",
      REFRESH_SECRET: process.env.REFRESH_SECRET ?? "test_refresh_secret_min_32_chars_long_yes",
      STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
      STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
      PLATFORM_ADMIN_SECRET_KEY: "SAKJGCYSE3GSBGGCGHGYFSXFDUHWC2FZ6JEMBLJ5TMRRH7C3J6ZD3X3Y",
      PLATFORM_ADMIN_PUBLIC_KEY: "GDTBSEHROHY6DBR4275ICUMCL46WYYV4BB5YARZMJM373MPLUYVJJORT",
      CIRCUIT_ZKEY_PATH: "/tmp/test/credential_final.zkey",
      CIRCUIT_WASM_PATH: "/tmp/test/credential.wasm",
      ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    },
    // Absolute paths so vitest resolves correctly regardless of cwd
    include: [resolve(root, "src/test/**/*.test.ts")],
    exclude: ["**/node_modules/**"],
    globals: true,
    environment: "node",
    setupFiles: [resolve(root, "src/test/setup.ts")],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [resolve(root, "src/**/*.ts")],
      exclude: [resolve(root, "src/test/**"), resolve(root, "prisma/**")],
    },
  },
})
