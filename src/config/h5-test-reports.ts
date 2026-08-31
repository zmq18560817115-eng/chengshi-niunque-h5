import type { PublicAsset } from "@/server/services/public-content-service";
import { ACCEPTANCE_PLACEHOLDER_ASSET_IDS } from "@/config/default-h5-content";

// 第四功能层级只呈现图片报告。当前图片位于 public/design/reports/，
// 正式报告图片上传后由后台数据接管；PDF 与外部链接不会进入公开 H5。
const TEST_REPORT_SOURCES = [
  { title: "检验检测报告（测试样例一）", src: "/design/reports/test-report-1.webp" },
  { title: "检验检测报告（测试样例二）", src: "/design/reports/test-report-2.webp" },
  { title: "检验检测报告（测试样例三）", src: "/design/reports/test-report-3.webp" },
  { title: "分析报告 COA（测试样例四）", src: "/design/reports/test-report-4.webp" },
  { title: "羊毛脂研究资料（测试样例五）", src: "/design/reports/test-report-5.webp" },
] as const;

const placeholderDescription = "图片报告待上传，当前显示图片占位。";

export const TEST_REPORT_PLACEHOLDERS: PublicAsset[] = TEST_REPORT_SOURCES.map((item, index) => ({
  id: ACCEPTANCE_PLACEHOLDER_ASSET_IDS[index] ?? `test-inline-detail-image-${index + 1}`,
  title: item.title,
  description: placeholderDescription,
  type: "IMAGE",
  href: item.src,
  openMode: "same_tab",
  pages: [{ id: `test-report-page-${index + 1}`, pageNumber: 1, href: item.src }],
}));

export function fourthLevelImageReports(assets: PublicAsset[]): PublicAsset[] {
  if (assets.length === 0) return TEST_REPORT_PLACEHOLDERS;

  return assets.map((asset, index) => {
    if (asset.type === "IMAGE") return asset;

    const placeholder = TEST_REPORT_PLACEHOLDERS[index % TEST_REPORT_PLACEHOLDERS.length];
    return {
      ...placeholder,
      id: `image-placeholder-${asset.id}`,
      title: asset.title,
      description: placeholderDescription,
      pages: placeholder.pages.map((page) => ({
        ...page,
        id: `image-placeholder-${asset.id}-${page.id}`,
      })),
    };
  });
}
