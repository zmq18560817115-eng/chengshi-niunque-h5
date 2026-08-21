import { notFound } from "next/navigation";
import { CategoryDetail } from "@/components/h5/CategoryDetail";
import { PublicContentService } from "@/server/services/public-content-service";
import { PublicContentLiveRefresh } from "@/components/h5/PublicContentLiveRefresh";

export const dynamic = "force-dynamic";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const content = await new PublicContentService().getContent(); const category = content.modules.find((module) => module.slug === slug); if (!category) notFound(); return <><PublicContentLiveRefresh version={content.version}/><CategoryDetail module={category}/></>; }
