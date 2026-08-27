import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Keep development chunks isolated from `next build`. A running dev server
  // must never read a production build that replaced its webpack chunk graph.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  experimental: { serverActions: { bodySizeLimit: "21mb" } },
  // 静态设计素材（引导页/档案分层贴图等）体量大且很少变动，给它们一层浏览器缓存：
  // 1 天内直接命中，之后 stale-while-revalidate 先用旧图再后台校验，兼顾加载速度与更新
  // 及时性。经 nginx 反代时该响应头会透传给浏览器，无需改部署配置。
  // 注：/_next/static 由 Next 自动打上 immutable 长缓存，这里只补 public 目录下的素材。
  async headers() {
    return [
      {
        source: "/design/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" },
        ],
      },
    ];
  },
};
export default nextConfig;
