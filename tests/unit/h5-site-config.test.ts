import { defaultH5SiteConfig, resolveH5SiteConfig } from "@/server/services/h5-site-config";

describe("H5 site configuration", () => {
  it("merges maintained values with safe defaults and clamps delay", () => {
    const config = resolveH5SiteConfig({ archiveTitle: "新的档案标题", guideDelaySeconds: 99 });
    expect(config.archiveTitle).toBe("新的档案标题");
    expect(config.guideDelaySeconds).toBe(10);
    expect(config.guideButtonText).toBe(defaultH5SiteConfig.guideButtonText);
  });

  it("uses defaults for invalid stored JSON", () => {
    expect(resolveH5SiteConfig(null)).toEqual(defaultH5SiteConfig);
  });
});
