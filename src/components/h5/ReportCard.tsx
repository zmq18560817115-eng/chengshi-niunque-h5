import type { PublicReportCard } from "@/server/services/public-content-service";
import { ReportViewer, type H5PreviewFocus } from "./ReportViewer";

export function ReportCard({ card, previewFocus, previewMode = false }: { card: PublicReportCard; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  return <article data-component="ReportCard" className={`report-card ${previewFocus?.cardId === card.id ? "preview-focus" : ""}`}>
    <h3>{card.title}</h3>{card.description && <p>{card.description}</p>}
    <ReportViewer assets={card.assets} previewFocus={previewFocus} previewMode={previewMode}/>
    {previewMode && card.buttonText && <button type="button" className="preview-card-action">{card.buttonText}</button>}
    {card.footerNote && <small>{card.footerNote}</small>}
  </article>;
}
