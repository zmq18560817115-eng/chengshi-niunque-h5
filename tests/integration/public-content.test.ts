import { GET } from "@/app/api/public/content/route";
import { PublicContentService } from "@/server/services/public-content-service";

describe("public content integration", () => {
  it("returns only published, online, non-deleted content in sort order", async () => {
    const content = await new PublicContentService().getContent();
    expect(content.modules.map((module) => module.title)).toEqual([
      "检测项目",
      "复核保障",
      "生产溯源",
    ]);
    expect(content.modules.flatMap((module) => module.cards).map((card) => card.title)).not.toEqual(
      expect.arrayContaining(["草稿卡片", "已删除卡片"]),
    );
    expect(content.modules[0].cards.map((card) => card.title)).toEqual([
      "营养成分检测",
      "安全指标检测",
    ]);
    expect(content.modules[0].cards[0].assets.map((asset) => asset.title)).toEqual([
      "检测方法公开说明",
      "营养成分检测报告",
    ]);
  });

  it("does not expose internal records, storage keys, or secrets", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("seed-admin@local.invalid");
    expect(serialized).not.toContain("S3_SECRET_ACCESS_KEY");
    expect(body.modules).toHaveLength(3);
  });
});
