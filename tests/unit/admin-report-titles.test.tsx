import { cleanup, render, screen } from "@testing-library/react";
import type { PrismaClient } from "@prisma/client";
import { ReportImagesManager } from "@/components/admin/ReportImagesManager";
import { AdminReportImagesService } from "@/server/services/admin-report-images-service";
import { PublicContentService } from "@/server/services/public-content-service";
import type { PublicContentRepository } from "@/server/repositories/public-content-repository";
import type { ObjectStorage } from "@/server/storage/object-storage";

vi.mock("@/app/admin/report-image-actions", () => ({ removeReportImagesAction: vi.fn() }));

const updatedAt = new Date("2026-09-10T00:00:00Z");
const visible = { contentStatus: "PUBLISHED" as const, isOnline: true, deletedAt: null, updatedAt };
const moduleRecord = { ...visible, id: "seed-module-review", slug: "review-assurance", title: "复核保障", description: null };
const cardRecord = {
  ...visible, id: "seed-card-review-stability-sensory", title: "产品基础型检", description: "工厂出厂检测和第三方检测，双层兜底检测",
  footerNote: null, module: moduleRecord,
  assets: ["产品基础型检报告", "本批次专项检测报告"].map((title, index) => ({
    ...visible, id: `report-${index}`, title, description: null, assetType: "IMAGE", mimeType: "image/png",
    storageKey: `reports/report-${index}.png`, pages: [{ id: `page-${index}`, pageNumber: 1, updatedAt, storageKey: `reports/page-${index}.png`, mimeType: "image/png" }],
  })),
};

describe("matching admin and public report titles", () => {
  afterEach(cleanup);

  it("renders the new project/report names and image labels while retaining every report binding", async () => {
    const before = structuredClone(cardRecord);
    const findMany = vi.fn().mockResolvedValue([cardRecord]);
    const client = { reportCard: { findMany } } as unknown as PrismaClient;
    const cards = await new AdminReportImagesService(client, {} as ObjectStorage).list();
    render(<ReportImagesManager cards={cards}/>);

    expect(screen.getByText("过敏原项筛查")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "过敏原项筛查报告", hidden: true })).toBeInTheDocument();
    expect(screen.getByAltText("过敏原项筛查报告第 1 页")).toHaveAttribute("src", `/api/admin/report-images/report-0?pageId=page-0&v=${updatedAt.getTime()}`);
    expect(screen.getByText("本批次专项检测报告")).toBeInTheDocument();
    expect(screen.queryByText("产品基础型检报告")).not.toBeInTheDocument();
    expect(cards[0]).toMatchObject({ id: cardRecord.id, href: `/reports/review-assurance/items/${cardRecord.id}/reports` });
    expect(cards[0].reports.map((report) => report.id)).toEqual(["report-0", "report-1"]);

    const repository = {
      listModules: vi.fn().mockResolvedValue([{ ...moduleRecord, cards: [cardRecord] }]),
      listSettings: vi.fn().mockResolvedValue([]),
    } as unknown as PublicContentRepository;
    const publicCard = (await new PublicContentService(repository).getContent()).modules[0].cards[0];
    expect(publicCard.assets.map((asset) => asset.title)).toEqual(cards[0].reports.map((report) => report.title));
    expect(publicCard.assets[0].pages[0].href).toBe("/reports/image/page/page-0");
    expect(cardRecord).toEqual(before);
  });
});
