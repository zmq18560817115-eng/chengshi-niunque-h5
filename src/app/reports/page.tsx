import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { PublicContentService, publicSiteConfig } from "@/server/services/public-content-service";
import { PublicContentLiveRefresh } from "@/components/h5/PublicContentLiveRefresh";

export const dynamic = "force-dynamic";
export default async function ReportsPage() { const content = await new PublicContentService().getContent(); return <><PublicContentLiveRefresh version={content.version}/><ReportsArchive modules={content.modules} config={publicSiteConfig(content)}/></>; }
