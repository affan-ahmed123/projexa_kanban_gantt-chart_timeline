import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/types"],
  reactStrictMode: true,
  typedRoutes: true
};

export default nextConfig;
