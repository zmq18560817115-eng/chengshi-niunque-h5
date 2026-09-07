import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("@/server/services/latest-batch-service", () => ({ LatestBatchService: class { get() { return Promise.resolve({ regularBatch: "GD00046087", trialBatch: "GD00046086", inspectionDate: "2026-08" }); } } }));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/server/auth/request-session", () => ({
  requireCurrentAdmin: vi.fn().mockResolvedValue({ displayName: "管理员" }),
}));
vi.mock("@/server/services/admin-content-service", () => ({
  AdminContentService: class {
    dashboard() {
      return Promise.resolve({ total: 3, draft: 0, draftCards: 0, draftAssets: 0, published: 3, offline: 0 });
    }
  },
}));
vi.mock("@/app/admin/actions", () => ({ logoutAction: vi.fn(), publishLatestBatchAction: vi.fn() }));

import AdminLayout from "@/app/admin/(protected)/layout";
import AdminPage from "@/app/admin/(protected)/page";
import SiteSettingsPage from "@/app/admin/(protected)/site/page";

describe("scoped homepage batch administration", () => {
  it("offers only the three approved batch fields at the site settings URL", async () => {
    render(await SiteSettingsPage());
    expect(screen.getByRole("textbox", { name: "正装批次号" })).toHaveValue("GD00046087");
    expect(screen.getByRole("textbox", { name: "试用装批次号" })).toHaveValue("GD00046086");
    expect(screen.getByRole("textbox", { name: /检测日期/ })).toHaveValue("2026-08");
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not expose a homepage settings link in admin navigation", async () => {
    render(await AdminLayout({ children: <div>内容</div> }));
    expect(screen.queryByRole("link", { name: /首页|页面内容|站点设置/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "报告资料" })).toHaveAttribute("href", "/admin/modules");
    expect(screen.getByRole("link", { name: "公开批次" })).toHaveAttribute("href", "/admin/site");
  });

  it("keeps the dashboard focused on report content management", async () => {
    render(await AdminPage());
    expect(screen.queryByRole("link", { name: /首页|页面内容|站点设置/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "管理报告资料" })).toHaveAttribute("href", "/admin/modules");
    expect(screen.getByRole("link", { name: "管理公开批次" })).toHaveAttribute("href", "/admin/site");
  });
});
