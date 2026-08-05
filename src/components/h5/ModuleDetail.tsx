import type { PublicModule } from "@/server/services/public-content-service";
import { ReportCard } from "./ReportCard";
import type { H5PreviewFocus } from "./ReportViewer";

export function ModuleDetail({ module, previewFocus, previewMode = false }: { module: PublicModule; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  return <div id={`module-panel-${module.id}`} data-component="ModuleDetail" className="module-detail">
    {module.cards.length > 0 ? module.cards.map((card) => <ReportCard key={card.id} card={card} previewFocus={previewFocus} previewMode={previewMode}/>) : <p className="placeholder-note">该模块暂无已发布报告卡片。</p>}
  </div>;
}
