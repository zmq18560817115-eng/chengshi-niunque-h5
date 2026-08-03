import type { PublicModule } from "@/server/services/public-content-service";
import { ReportCard } from "./ReportCard";

export function ModuleDetail({ module }: { module: PublicModule }) {
  return (
    <div id={`module-panel-${module.id}`} data-component="ModuleDetail" className="module-detail">
      {module.cards.length > 0 ? (
        module.cards.map((card) => <ReportCard key={card.id} card={card} />)
      ) : (
        <p className="placeholder-note">该模块暂无已发布报告卡片。</p>
      )}
    </div>
  );
}
