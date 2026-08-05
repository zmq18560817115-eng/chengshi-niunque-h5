import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";
import { PublicContentService } from "@/server/services/public-content-service";

export const dynamic = "force-dynamic";
export default async function ReportPage({ params }: { params: Promise<{ slug: string; cardId: string }> }) { const { slug, cardId } = await params; const result = await new PublicContentService().getCard(slug, cardId); if (!result) notFound(); return <main className="h5-shell report-page"><header><Link href={`/reports/${slug}`}>← 返回{result.module.title}</Link><p className="eyebrow">报告资料</p><h1>{result.card.title}</h1></header><section>{result.card.assets.map((asset) => asset.type === "IMAGE" ? <ImageReportViewer key={asset.id} asset={asset}/> : <a key={asset.id} className="report-file-link" href={asset.href} target={asset.openMode === "new_tab" ? "_blank" : undefined} rel="noreferrer">{asset.title} · 打开{asset.type === "PDF" ? " PDF" : "外部资料"}</a>)}</section></main>; }
