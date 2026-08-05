import { notFound } from "next/navigation";
import { CategoryDetail } from "@/components/h5/CategoryDetail";
import { PublicContentService } from "@/server/services/public-content-service";

export const dynamic = "force-dynamic";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const category = await new PublicContentService().getModuleBySlug(slug); if (!category) notFound(); return <CategoryDetail module={category}/>; }
