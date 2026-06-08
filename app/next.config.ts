import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // @teg/engine ships raw TS (main → src/index.ts); let Next transpile it.
  transpilePackages: ["@teg/engine"],
};

export default nextConfig;
