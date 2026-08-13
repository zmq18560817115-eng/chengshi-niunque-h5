import { notFound } from "next/navigation";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { getCategoryTheme, getPlaceholderSlot } from "@/config/h5-category-themes";
import { PublicContentService } from "@/server/services/public-content-service";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ slug: string; cardId: string }> }) {
  const { slug, cardId } = await params;
  const result = await new PublicContentService().getCard(slug, cardId);
  const theme = getCategoryTheme(slug);
  const placeholderSlot = getPlaceholderSlot(slug, cardId);
  if (!result && placeholderSlot === null) notFound();
  if (!result && placeholderSlot !== null) return <SwipeBackPage className={`h5-shell report-page report-page-final h5-page-transition ${theme.backgroundClass}`} fallbackHref={`/reports/${slug}`} data-theme={theme.theme}>
    <section className="report-page-title report-placeholder-title"><p>{theme.label}</p><h1>资料整理中</h1><div>当前板块的报告资料尚未完成上传，正式资料发布后将在此处展示。</div></section>
    <section className="report-page-content"><div className="report-placeholder-page" role="status"><strong>暂无公开资料</strong><p>这是第{placeholderSlot + 1}个固定报告板块的临时占位页面。</p></div></section>
  </SwipeBackPage>;
  if (!result) notFound();
  const images = result.card.assets.filter((asset) => asset.type === "IMAGE");
  const files = result.card.assets.filter((asset) => asset.type !== "IMAGE");

  return <SwipeBackPage className={`h5-shell report-page report-page-final h5-page-transition ${theme.backgroundClass}`} fallbackHref={`/reports/${slug}`} data-theme={theme.theme}>
    <section className="report-page-title">
      <p>{theme.label}</p><h1>{result.card.title}</h1>{result.card.description && <div>{result.card.description}</div>}
    </section>
    <section className="report-page-content" aria-label="报告内容">
      {images.map((asset) => <ImageReportViewer key={asset.id} asset={asset}/>)}
      {files.map((asset) => <article key={asset.id} className="report-file-card"><div><h2>{asset.title}</h2>{asset.description && <p>{asset.description}</p>}</div><a href={asset.href} target={asset.openMode === "new_tab" ? "_blank" : undefined} rel="noreferrer">{asset.type === "PDF" ? "查看原 PDF" : "打开外部资料"}</a></article>)}
      {result.card.assets.length === 0 && <p className="report-empty">当前没有已公开的报告资料。</p>}
    </section>
    <footer className="report-page-footer"><p>{result.card.footerNote || "报告仅供对应批次查阅，请以当前公开版本为准。"}</p></footer>
  </SwipeBackPage>;
}
