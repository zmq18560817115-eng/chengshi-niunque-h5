import { notFound } from "next/navigation";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { getCategoryTheme } from "@/config/h5-category-themes";
import { PublicContentService } from "@/server/services/public-content-service";
import { PublicContentLiveRefresh } from "@/components/h5/PublicContentLiveRefresh";
import { isReservedPlaceholderCardId } from "@/server/public-report-policy";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ slug: string; cardId: string }> }) {
  const { slug, cardId } = await params;
  if (isReservedPlaceholderCardId(cardId)) notFound();
  const snapshot = await new PublicContentService().getCardSnapshot(slug, cardId);
  const result = snapshot.result;
  if (!result) notFound();
  const theme = getCategoryTheme(slug);
  const images = result.card.assets.filter((asset) => asset.type === "IMAGE");

  return <><PublicContentLiveRefresh version={snapshot.version}/><SwipeBackPage className={`h5-shell report-page report-page-final ${theme.backgroundClass}`} fallbackHref={`/reports/${slug}`} showBackControl={false} data-theme={theme.theme}>
    <section className="report-page-title">
      <p>{theme.label}</p><h1>{result.card.title}</h1>{result.card.description && <div>{result.card.description}</div>}
    </section>
    <section className="report-page-content" aria-label="报告内容">
      {images.map((asset) => <ImageReportViewer key={asset.id} asset={asset} returnHref={`/reports/${slug}`} returnLabel={`返回${theme.label}`}/>)}
      {images.length === 0 ? <div className="report-empty" role="status"><strong>暂无已发布图片报告</strong><p>当前资料尚未发布可查看的图片报告。</p></div> : null}
    </section>
    <footer className="report-page-footer"><p>{result.card.footerNote || "报告仅供对应批次查阅，请以当前公开版本为准。"}</p></footer>
  </SwipeBackPage></>;
}
