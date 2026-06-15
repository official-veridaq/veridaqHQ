import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "lib/async-storage-shim.ts"
      ),
    }

    return config
  },
}

export default nextConfig
