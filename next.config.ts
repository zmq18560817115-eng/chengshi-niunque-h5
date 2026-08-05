import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  experimental: { serverActions: { bodySizeLimit: "21mb" } },
};
export default nextConfig;
