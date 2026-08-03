import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "诚实纽雀｜首页检测报告", description: "诚实纽雀检测与溯源信息" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
