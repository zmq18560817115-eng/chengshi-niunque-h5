import { notFound } from "next/navigation";
import { AdminContentService } from "@/server/services/admin-content-service";
import { PublicContentService } from "@/server/services/public-content-service";
import { ModuleWorkspace } from "@/components/admin/ModuleWorkspace";

type ModulePageSearchParams = {
  saved?: string;
  published?: string;
  select?: string;
  error?: string;
};

export default async function ModulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ModulePageSearchParams> }) {
  const { id } = await params;
  const adminService = new AdminContentService();
  const [item, publicContent, moduleRows] = await Promise.all([
    adminService.getModuleWorkspace(id),
    new PublicContentService().getContent(),
    adminService.listModules(),
  ]);
  if (!item) notFound();
  const { saved, published, select, error } = await searchParams;
  const initialSelection = select?.startsWith("card:")
    ? { type: "card" as const, id: select.slice(5) }
    : select?.startsWith("asset:")
      ? { type: "asset" as const, id: select.slice(6) }
      : undefined;

  return <ModuleWorkspace
    saved={saved === "1"}
    published={published === "1"}
    error={error}
    initialSelection={initialSelection}
    publishedModules={publicContent.modules}
    moduleOrders={moduleRows.map((module) => ({ id: module.id, sortOrder: module.sortOrder }))}
    initialModule={{
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      sortOrder: item.sortOrder,
      contentStatus: item.contentStatus,
      cards: item.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        buttonText: card.buttonText,
        footerNote: card.footerNote,
        sortOrder: card.sortOrder,
        contentStatus: card.contentStatus,
        assets: card.assets.map((asset) => ({
          id: asset.id,
          title: asset.title,
          description: asset.description,
          assetType: asset.assetType,
          openMode: asset.openMode,
          storageKey: asset.storageKey,
          mimeType: asset.mimeType,
          externalUrl: asset.externalUrl,
          sortOrder: asset.sortOrder,
          contentStatus: asset.contentStatus,
          pages: asset.pages.map((page) => ({ id: page.id, pageNumber: page.pageNumber, storageKey: page.storageKey, mimeType: page.mimeType })),
        })),
      })),
    }}
  />;
}
