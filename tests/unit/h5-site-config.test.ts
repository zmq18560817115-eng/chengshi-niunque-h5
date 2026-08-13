import { h5FixedContent } from "@/config/h5-fixed-content";
import { defaultH5SiteConfig, resolveH5SiteConfig } from "@/server/services/h5-site-config";

describe("H5 site configuration", () => {
  it("uses fixed front-end copy and ignores persisted homepage settings", () => {
    const config = resolveH5SiteConfig({ archiveTitle: "数据库里的旧标题", guideDelaySeconds: 99 });
    expect(config.archiveTitle).toBe(h5FixedContent.archiveTitle);
    expect(config.guideDelaySeconds).toBe(0);
    expect(config.guideButtonText).toBe(h5FixedContent.guideButtonText);
  });

  it("uses the same fixed config for invalid stored JSON", () => {
    expect(resolveH5SiteConfig(null)).toEqual(defaultH5SiteConfig);
  });
});
