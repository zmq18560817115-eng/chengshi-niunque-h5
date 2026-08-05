import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { PublicContentService, publicSiteConfig } from "@/server/services/public-content-service";

export const dynamic = "force-dynamic";
export default async function ReportsPage() { const content = await new PublicContentService().getContent(); return <ReportsArchive modules={content.modules} config={publicSiteConfig(content)}/>; }
