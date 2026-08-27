import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "诚实纽雀｜首页检测报告", description: "诚实纽雀检测与溯源信息" };
// viewport-fit=cover 让 env(safe-area-inset-*) 在刘海屏/状态栏机型生效，
// 避免引导页顶部 Logo 被系统状态栏裁切；device-width + 1 倍初始缩放保证等比自适应。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8e89d",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
