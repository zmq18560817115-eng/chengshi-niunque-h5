import type { PublicModule } from "@/server/services/public-content-service";
import { ReportsArchive } from "./ReportsArchive";
import { CategoryDetail } from "./CategoryDetail";
import { ModuleDetail } from "./ModuleDetail";
import type { H5PreviewFocus } from "./ReportViewer";

export function H5PageContent({ modules, previewFocus, previewMode = false }: { modules?: PublicModule[]; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  const availableModules = modules ?? [];
  const selected = availableModules.find((item) => item.id === previewFocus?.moduleId);
  return <div className="h5-journey-preview">
    <ReportsArchive modules={availableModules} preview={previewMode}/>
    {(selected ? [selected] : availableModules).map((item) => <section key={item.id} className={item.id === previewFocus?.moduleId ? "preview-module-focus" : undefined}>
      <CategoryDetail module={item} preview={previewMode}/>
      {previewFocus?.assetId && item.id === previewFocus.moduleId ? <ModuleDetail module={item} previewFocus={previewFocus} previewMode={previewMode}/> : null}
    </section>)}
  </div>;
}
