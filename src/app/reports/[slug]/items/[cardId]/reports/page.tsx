import { notFound } from "next/navigation";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { getCategoryTheme, getPlaceholderSlot } from "@/config/h5-category-themes";
import { TEST_REPORT_PLACEHOLDERS } from "@/config/h5-test-reports";
import { PublicContentService } from "@/server/services/public-content-service";
import { PublicContentLiveRefresh } from "@/components/h5/PublicContentLiveRefresh";

export const dynamic = "force-dynamic";

function TestReportPlaceholders() {
  return <>
    <p className="report-placeholder-note" role="status">以下为测试用检测报告占位，正式检测资料发布后将自动替换。</p>
    {TEST_REPORT_PLACEHOLDERS.map((asset) => <ImageReportViewer key={asset.id} asset={asset}/>)}
  </>;
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string; cardId: string }> }) {
  const { slug, cardId } = await params;
  const snapshot = await new PublicContentService().getCardSnapshot(slug, cardId);
  const result = snapshot.result;
  const theme = getCategoryTheme(slug);
  const placeholderSlot = getPlaceholderSlot(slug, cardId);
  if (!result && placeholderSlot === null) notFound();
  if (!result && placeholderSlot !== null) return <><PublicContentLiveRefresh version={snapshot.version}/><SwipeBackPage className={`h5-shell report-page report-page-final h5-page-transition ${theme.backgroundClass}`} fallbackHref={`/reports/${slug}`} data-theme={theme.theme}>
    <section className="report-page-title report-placeholder-title"><p>{theme.label}</p><h1>测试报告占位</h1><div>当前板块的正式报告资料尚未完成上传，以下为测试报告占位。</div></section>
    <section className="report-page-content" aria-label="报告内容"><TestReportPlaceholders/></section>
  </SwipeBackPage></>;
  if (!result) notFound();
  const images = result.card.assets.filter((asset) => asset.type === "IMAGE");
  const files = result.card.assets.filter((asset) => asset.type !== "IMAGE");

  return <><PublicContentLiveRefresh version={snapshot.version}/><SwipeBackPage className={`h5-shell report-page report-page-final h5-page-transition ${theme.backgroundClass}`} fallbackHref={`/reports/${slug}`} data-theme={theme.theme}>
    <section className="report-page-title">
      <p>{theme.label}</p><h1>{result.card.title}</h1>{result.card.description && <div>{result.card.description}</div>}
    </section>
    <section className="report-page-content" aria-label="报告内容">
      {images.map((asset) => <ImageReportViewer key={asset.id} asset={asset}/>)}
      {files.map((asset) => <article key={asset.id} className="report-file-card"><div><h2>{asset.title}</h2>{asset.description && <p>{asset.description}</p>}</div><a href={asset.href} target={asset.openMode === "new_tab" ? "_blank" : undefined} rel="noreferrer">{asset.type === "PDF" ? "查看原 PDF" : "打开外部资料"}</a></article>)}
      {result.card.assets.length === 0 && <TestReportPlaceholders/>}
    </section>
    <footer className="report-page-footer"><p>{result.card.footerNote || "报告仅供对应批次查阅，请以当前公开版本为准。"}</p></footer>
  </SwipeBackPage></>;
}
