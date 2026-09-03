import type { AssetType } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  PublicContentRepository,
  type PublicModuleRecord,
} from "@/server/repositories/public-content-repository";
import { isProductionPublicRecord } from "@/server/public-report-policy";
import { hasMatchingReportImageExtension, isStaticReportImageMimeType } from "@/server/report-image-policy";
import { defaultH5SiteConfig, type H5SiteConfig } from "./h5-site-config";

export type PublicAsset = {
  id: string;
  title: string;
  description: string | null;
  type: AssetType;
  href: string;
  openMode: "same_tab" | "new_tab";
  pages: Array<{ id: string; pageNumber: number; href: string }>;
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
  version: string;
  modules: PublicModule[];
  settings: Array<{ key: string; name: string; value: unknown }>;
};

export function publicSiteConfig(_content: PublicContent): H5SiteConfig {
  void _content;
  return defaultH5SiteConfig;
}

type PublicAssetRecord = PublicModuleRecord["cards"][number]["assets"][number];

function isPublicImageAsset(asset: PublicAssetRecord): boolean {
  if (asset.assetType !== "IMAGE" || !isProductionPublicRecord(asset)) return false;
  if (asset.pages.length > 0) {
    return asset.pages.every((page) => (
      isStaticReportImageMimeType(page.mimeType)
      && hasMatchingReportImageExtension(page.storageKey, page.mimeType)
    ));
  }
  return Boolean(
    asset.storageKey
    && isStaticReportImageMimeType(asset.mimeType)
    && hasMatchingReportImageExtension(asset.storageKey, asset.mimeType),
  );
}

function visibleAssets(card: PublicModuleRecord["cards"][number]): PublicAssetRecord[] {
  return card.assets.filter(isPublicImageAsset);
}

function visibleCards(module: PublicModuleRecord): PublicModuleRecord["cards"] {
  return module.cards.filter(isProductionPublicRecord);
}

function visibleModules(modules: PublicModuleRecord[]): PublicModuleRecord[] {
  return modules.filter(isProductionPublicRecord);
}

function assetHref(asset: PublicAssetRecord): string {
  return `/reports/image/${asset.id}`;
}

export function reportButtonText(reportCount: number): string {
  return reportCount > 0 ? `查看${reportCount}份报告` : "暂无报告";
}

function contentVersion(modules: PublicModuleRecord[], settings: Array<{ updatedAt: Date }>): string {
  const publicShape = {
    settings: settings.map((setting) => setting.updatedAt.toISOString()),
    modules: visibleModules(modules).map((module) => ({
      id: module.id,
      updatedAt: module.updatedAt.toISOString(),
      cards: visibleCards(module).map((card) => ({
        id: card.id,
        updatedAt: card.updatedAt.toISOString(),
        assets: visibleAssets(card).map((asset) => ({
          id: asset.id,
          updatedAt: asset.updatedAt.toISOString(),
          pages: asset.pages.map((page) => ({ id: page.id, updatedAt: page.updatedAt.toISOString() })),
        })),
      })),
    })),
  };
  return createHash("sha256").update(JSON.stringify(publicShape)).digest("hex");
}

export class PublicContentService {
  constructor(private readonly repository = new PublicContentRepository()) {}

  async getContent(): Promise<PublicContent> {
    const [modules, settings] = await Promise.all([
      this.repository.listModules(),
      this.repository.listSettings(),
    ]);

    return {
      version: contentVersion(modules, settings),
      modules: visibleModules(modules).map((module) => ({
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        cards: visibleCards(module).map((card) => {
          const assets = visibleAssets(card);
          return {
            id: card.id,
            title: card.title,
            description: card.description,
            buttonText: reportButtonText(assets.length),
            footerNote: card.footerNote,
            assets: assets.map((asset) => ({
              id: asset.id,
              title: asset.title,
              description: asset.description,
              type: "IMAGE" as const,
              href: assetHref(asset),
              openMode: "same_tab" as const,
              pages: asset.pages.length > 0
                ? asset.pages.map((page) => ({ id: page.id, pageNumber: page.pageNumber, href: `/reports/image/page/${page.id}` }))
                : [{ id: asset.id, pageNumber: 1, href: `/reports/image/${asset.id}` }],
            })),
          };
        }),
      })),
      settings: settings.map((setting) => ({
        key: setting.key,
        name: setting.name,
        value: setting.value,
      })),
    };
  }

  async getModuleBySlug(slug: string): Promise<PublicModule | null> {
    const content = await this.getContent();
    return content.modules.find((module) => module.slug === slug) ?? null;
  }

  async getCard(slug: string, cardId: string): Promise<{ module: PublicModule; card: PublicReportCard } | null> {
    const category = await this.getModuleBySlug(slug);
    const card = category?.cards.find((item) => item.id === cardId);
    return category && card ? { module: category, card } : null;
  }

  async getCardSnapshot(slug: string, cardId: string): Promise<{ version: string; result: { module: PublicModule; card: PublicReportCard } | null }> {
    const content = await this.getContent();
    const category = content.modules.find((item) => item.slug === slug);
    const card = category?.cards.find((item) => item.id === cardId);
    return { version: content.version, result: category && card ? { module: category, card } : null };
  }
}
