import type { PublicModule } from "@/server/services/public-content-service";
import { HeroIntro } from "./HeroIntro";
import { EvidenceOverview } from "./EvidenceOverview";
import { InformationModules } from "./InformationModules";
import { BrandStory } from "./BrandStory";
import { PageFooter } from "./PageFooter";
import type { H5PreviewFocus } from "./ReportViewer";

export function H5PageContent({ modules, previewFocus, previewMode = false }: { modules?: PublicModule[]; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  return <main className="h5-shell"><HeroIntro/><EvidenceOverview/><InformationModules initialModules={modules} previewFocus={previewFocus} previewMode={previewMode}/><BrandStory/><PageFooter/></main>;
}
