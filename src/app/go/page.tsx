import { GuideExperience } from "@/components/h5/GuideExperience";
import { PublicContentService, publicSiteConfig } from "@/server/services/public-content-service";
import { PublicContentLiveRefresh } from "@/components/h5/PublicContentLiveRefresh";

// Keep the H5 entry HTML tied to the current deployment. Artwork and Next.js
// chunks retain their own cache policies, while a reopened WebView receives
// the latest route tree instead of a year-long cached shell.
export const dynamic = "force-dynamic";

export default async function GoPage() {
  try {
    const content = await new PublicContentService().getContent();
    return <><PublicContentLiveRefresh version={content.version}/><GuideExperience latestBatch={publicSiteConfig(content).latestBatch}/></>;
  } catch {
    // Preserve the existing guide's availability during a temporary data outage.
    return <GuideExperience/>;
  }
}
