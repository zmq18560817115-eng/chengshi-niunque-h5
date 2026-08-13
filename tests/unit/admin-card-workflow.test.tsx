import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/admin/actions", () => ({
  createAndPublishAssetAction: vi.fn(),
  createAssetAction: vi.fn(),
  createCardAction: vi.fn(),
  deleteAssetAction: vi.fn(),
  deleteCardAction: vi.fn(),
  deleteModuleAction: vi.fn(),
  updateAssetAction: vi.fn(),
  updateCardAction: vi.fn(),
  updateModuleAction: vi.fn(),
}));

vi.mock("@/components/admin/AdminPreview", () => ({
  AdminPreview: () => <aside>预览区域</aside>,
}));

vi.mock("@/server/validation/admin-content", () => ({
  checkModulePublishReadiness: () => [],
}));

import { ModuleWorkspace } from "@/components/admin/ModuleWorkspace";

const baseModule = {
  id: "module-1",
  title: "检测项目",
  slug: "inspection-projects",
  description: "说明",
  sortOrder: 10,
  contentStatus: "PUBLISHED" as const,
  cards: [{
    id: "card-1",
    title: "营养成分检测",
    description: "检测说明",
    buttonText: "查看报告",
    footerNote: null,
    sortOrder: 10,
    contentStatus: "DRAFT" as const,
    assets: [],
  }],
};

describe("admin card publishing workflow", () => {
  it("opens the requested card and exposes a direct publish action", () => {
    render(<ModuleWorkspace initialModule={baseModule} initialSelection={{ type: "card", id: "card-1" }} publishedModules={[]} moduleOrders={[]} />);

    expect(screen.getByRole("heading", { name: "基本内容" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("营养成分检测")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存并发布卡片" })).toBeInTheDocument();
  });

  it("keeps the create flow concise and explains the next step", () => {
    render(<ModuleWorkspace initialModule={baseModule} publishedModules={[]} moduleOrders={[]} />);

    expect(screen.getByText("第一步只创建草稿；创建后进入第二步添加图片、PDF 或外部链接。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建草稿并添加资料" })).toBeInTheDocument();
  });

  it("offers a direct publish path when adding the first asset", () => {
    render(<ModuleWorkspace initialModule={baseModule} initialSelection={{ type: "card", id: "card-1" }} publishedModules={[]} moduleOrders={[]} />);

    expect(screen.getByRole("button", { name: "仅保存资料草稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布资料并上线卡片" })).toBeInTheDocument();
    expect(screen.getByText("推荐：资料确认无误后直接上线；尚未准备好时再选择仅保存草稿。")).toBeInTheDocument();
  });

  it("shows server validation errors inside the editor", () => {
    render(<ModuleWorkspace initialModule={baseModule} error="请先上传有效资料" publishedModules={[]} moduleOrders={[]} />);

    expect(screen.getByRole("alert")).toHaveTextContent("操作未完成");
    expect(screen.getByRole("alert")).toHaveTextContent("请先上传有效资料");
  });

  it("redirects newly created content back to its editor", () => {
    const actions = readFileSync("src/app/admin/actions.ts", "utf8");
    expect(actions).toContain("select=card:${created.id}");
    expect(actions).toContain("select: `asset:${createdId}`");
  });
});
