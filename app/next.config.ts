import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // @teg/engine ships raw TS (main → src/index.ts); let Next transpile it.
  transpilePackages: ["@teg/engine"],
  experimental: {
    // Resolve ESM .js specifiers → .ts/.tsx sources (needed for @teg/engine internal imports
    // and for @/ alias imports that use .js extensions in strict ESM style).
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    },
  },
};

export default nextConfig;
