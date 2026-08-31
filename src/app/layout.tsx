import type { Metadata, Viewport } from "next";
import "./globals.css";
import { H5HierarchyTracker } from "@/components/h5/H5HierarchyTracker";

export const metadata: Metadata = {
  title: "诚实纽雀｜首页检测报告",
  description: "诚实纽雀检测与溯源信息",
  icons: { icon: "/design/final-v1/archive/module-1/archive-logo.webp" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f0df",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><H5HierarchyTracker/>{children}<div id="h5-guide-route-buffer-host" aria-hidden="true" /><div id="h5-category-route-buffer-host" aria-hidden="true" /></body></html>;
}
