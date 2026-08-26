import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { createElement, type ImgHTMLAttributes } from "react";
import type { ImageProps } from "next/image";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: ImageProps) => {
    const imageProps = { ...rest } as Record<string, unknown>;
    for (const nextOnlyProp of ["fill", "loader", "priority", "quality", "unoptimized", "placeholder", "blurDataURL"]) {
      delete imageProps[nextOnlyProp];
    }
    if (!Number.isFinite(Number(imageProps.width))) delete imageProps.width;
    if (!Number.isFinite(Number(imageProps.height))) delete imageProps.height;
    const resolvedSrc = typeof src === "string" ? src : "default" in src ? src.default.src : src.src;
    return createElement("img", { ...imageProps as ImgHTMLAttributes<HTMLImageElement>, src: resolvedSrc, alt });
  },
}));

Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  const value = match[2].trim();
  process.env[match[1]] = value.replace(/^(["'])(.*)\1$/, "$2");
}
