import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import postcss, { type AcceptedPlugin } from "postcss";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pxToViewport = require("postcss-px-to-viewport-8-plugin") as (
  options: Record<string, unknown>,
) => AcceptedPlugin;

async function loadPluginOptions(): Promise<Record<string, unknown>> {
  // The runtime PostCSS config is JavaScript so the build tool and this test share one source of truth.
  // @ts-expect-error TypeScript does not emit declarations for the project-level mjs config.
  const { default: config } = await import("../../postcss.config.mjs");
  return config.plugins["postcss-px-to-viewport-8-plugin"];
}

describe("750px design-to-vw conversion", () => {
  it("converts opted-in design CSS with the 750px formula", async () => {
    const options = await loadPluginOptions();
    const result = await postcss([pxToViewport(options)]).process(
      ".card { width: 200px; height: 100px; border: 1px solid; }",
      { from: "card.vw.css" },
    );

    expect(result.css).toContain("width: 26.666667vw");
    expect(result.css).toContain("height: 13.333333vw");
    expect(result.css).toContain("border: 1px solid");
  });

  it("leaves existing non-opted-in styles unchanged", async () => {
    const options = await loadPluginOptions();
    const source = ".legacy { width: 750px; min-height: 44px; }";
    const result = await postcss([pxToViewport(options)]).process(source, {
      from: "globals.css",
    });

    expect(result.css).toBe(source);
  });

  it("keeps the generated viewport metadata accessible and safe-area aware", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain('width: "device-width"');
    expect(layout).toContain("initialScale: 1");
    expect(layout).toContain('viewportFit: "cover"');
  });
});
