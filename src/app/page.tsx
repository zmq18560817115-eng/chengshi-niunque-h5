import { BrandGuide } from "@/components/h5/BrandGuide";
import { PublicContentService, publicSiteConfig } from "@/server/services/public-content-service";

export const dynamic = "force-dynamic";
export default async function HomePage() { const content = await new PublicContentService().getContent(); return <BrandGuide config={publicSiteConfig(content)}/>; }
