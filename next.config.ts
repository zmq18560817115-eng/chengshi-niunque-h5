import type { NextConfig } from "next";

const designAssetCacheControl = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400";

const nextConfig: NextConfig = {
  // Keep development chunks isolated from `next build`. A running dev server
  // must never read a production build that replaced its webpack chunk graph.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  experimental: { serverActions: { bodySizeLimit: "21mb" } },
  async headers() {
    return [
      {
        // Design files keep stable repository paths. A one-day browser/CDN
        // window accelerates repeat visits without making same-name artwork
        // replacements remain stale for a long release cycle.
        source: "/design/:path*",
        headers: [{ key: "Cache-Control", value: designAssetCacheControl }],
      },
    ];
  },
};
export default nextConfig;
