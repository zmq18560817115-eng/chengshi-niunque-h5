import type { PublicAsset } from "@/server/services/public-content-service";
import { ACCEPTANCE_PLACEHOLDER_ASSET_IDS } from "@/config/default-h5-content";

// 第四功能层级（报告展示）测试占位：由上传的 PDF 检测报告转成静态图片，
// 在报告板块尚无正式资料时作为“测试报告”占位展示。
// 图片位于 public/design/reports/ 下，正式资料上传后由后台数据接管、自动覆盖占位。
const TEST_REPORT_SOURCES = [
  { title: "检验检测报告（测试样例一）", src: "/design/reports/test-report-1.webp" },
  { title: "检验检测报告（测试样例二）", src: "/design/reports/test-report-2.webp" },
  { title: "检验检测报告（测试样例三）", src: "/design/reports/test-report-3.webp" },
] as const;

const placeholderDescription = "测试占位报告，正式检测资料发布后将自动替换。";

export const TEST_REPORT_PLACEHOLDERS: PublicAsset[] = TEST_REPORT_SOURCES.map((item, index) => ({
  id: ACCEPTANCE_PLACEHOLDER_ASSET_IDS[index] ?? `test-inline-detail-image-${index + 1}`,
  title: item.title,
  description: placeholderDescription,
  type: "IMAGE",
  href: item.src,
  openMode: "same_tab",
}));
