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
  it.each([
    [360, 96, 48],
    [375, 100, 50],
    [390, 104, 52],
    [393, 104.8, 52.4],
    [412, 109.866667, 54.933333],
    [428, 114.133333, 57.066667],
    [430, 114.666667, 57.333333],
  ])("keeps a 200x100 design card proportional at a %ipx viewport", (viewportWidth, expectedWidth, expectedHeight) => {
    const widthVw = 200 / 750 * 100;
    const heightVw = 100 / 750 * 100;
    const renderedWidth = viewportWidth * widthVw / 100;
    const renderedHeight = viewportWidth * heightVw / 100;

    expect(renderedWidth).toBeCloseTo(expectedWidth, 5);
    expect(renderedHeight).toBeCloseTo(expectedHeight, 5);
    expect(renderedWidth / viewportWidth).toBeCloseTo(200 / 750, 8);
    expect(renderedWidth / renderedHeight).toBeCloseTo(2, 8);
  });

  it.each(["card.vw.css", "card.vw.module.css"])("converts opted-in design CSS with the 750px formula for %s", async (from) => {
    const options = await loadPluginOptions();
    const result = await postcss([pxToViewport(options)]).process(
      ".card { width: 200px; height: 100px; border: 1px solid; }",
      { from },
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

  it("converts the shared 750 x 1625 guide canvas without converting its desktop cap", async () => {
    const options = await loadPluginOptions();
    const sourcePath = "src/app/guide-adaptation.vw.css";
    const source = readFileSync(sourcePath, "utf8");
    const result = await postcss([pxToViewport(options)]).process(source, {
      from: sourcePath,
    });

    expect(source).toMatch(
      /\.brand-guide-portrait-scene,\s*\.h5-guide-route-snapshot\.is-portrait\s*\{[^}]*width:\s*750px;[^}]*height:\s*1625px;/,
    );
    expect(result.css).toMatch(
      /\.brand-guide-portrait-scene,\s*\.h5-guide-route-snapshot\.is-portrait\s*\{[^}]*width:\s*100vw;[^}]*height:\s*216\.666667vw;/,
    );
    expect(result.css).toMatch(
      /@media \(min-width:\s*750px\)\s*\{[\s\S]*?\.brand-guide-portrait-scene,\s*\.h5-guide-route-snapshot\.is-portrait\s*\{[^}]*width:\s*750px;[^}]*height:\s*1625px;/,
    );
  });

  it("loads the opted-in guide stylesheet after globals and emits safe viewport metadata", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(
      /import "\.\/globals\.css";\s*import "\.\/guide-adaptation\.vw\.css";/,
    );
    expect(layout).toContain('width: "device-width"');
    expect(layout).toContain("initialScale: 1");
    expect(layout).toContain('viewportFit: "cover"');
  });
});
