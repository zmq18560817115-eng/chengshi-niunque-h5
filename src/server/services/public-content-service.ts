import type { AssetType } from "@prisma/client";
import {
  PublicContentRepository,
  type PublicModuleRecord,
} from "@/server/repositories/public-content-repository";

export type PublicAsset = {
  id: string;
  title: string;
  description: string | null;
  type: AssetType;
  href: string;
  openMode: "same_tab" | "new_tab";
};

export type PublicReportCard = {
  id: string;
  title: string;
  description: string | null;
  buttonText: string;
  footerNote: string | null;
  assets: PublicAsset[];
};

export type PublicModule = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cards: PublicReportCard[];
};

export type PublicContent = {
  modules: PublicModule[];
  settings: Array<{ key: string; name: string; value: unknown }>;
};

function assetHref(asset: PublicModuleRecord["cards"][number]["assets"][number]): string {
  if (asset.assetType === "EXTERNAL_LINK") {
    return asset.externalUrl ?? "";
  }
  const viewer = asset.assetType === "PDF" ? "pdf" : "image";
  return `/reports/${viewer}/${asset.id}`;
}

export class PublicContentService {
  constructor(private readonly repository = new PublicContentRepository()) {}

  async getContent(): Promise<PublicContent> {
    const [modules, settings] = await Promise.all([
      this.repository.listModules(),
      this.repository.listSettings(),
    ]);

    return {
      modules: modules.map((module) => ({
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        cards: module.cards.map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description,
          buttonText: card.buttonText,
          footerNote: card.footerNote,
          assets: card.assets.map((asset) => ({
            id: asset.id,
            title: asset.title,
            description: asset.description,
            type: asset.assetType,
            href: assetHref(asset),
            openMode: asset.assetType === "EXTERNAL_LINK" ? "new_tab" : "same_tab",
          })),
        })),
      })),
      settings: settings.map((setting) => ({
        key: setting.key,
        name: setting.name,
        value: setting.value,
      })),
    };
  }
}
