import type { PublicReportCard } from "@/server/services/public-content-service";
import { ReportViewer } from "./ReportViewer";

export function ReportCard({ card }: { card: PublicReportCard }) {
  return (
    <article data-component="ReportCard" className="report-card">
      <h3>{card.title}</h3>
      {card.description && <p>{card.description}</p>}
      <ReportViewer assets={card.assets} />
      {card.footerNote && <small>{card.footerNote}</small>}
    </article>
  );
}
