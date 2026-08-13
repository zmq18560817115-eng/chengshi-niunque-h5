import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Keep development chunks isolated from `next build`. A running dev server
  // must never read a production build that replaced its webpack chunk graph.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  experimental: { serverActions: { bodySizeLimit: "21mb" } },
};
export default nextConfig;
