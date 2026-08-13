import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

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
vi.mock("@/app/admin/actions", () => ({ logoutAction: vi.fn() }));

import AdminLayout from "@/app/admin/(protected)/layout";
import AdminPage from "@/app/admin/(protected)/page";
import SiteSettingsPage from "@/app/admin/(protected)/site/page";

describe("removed homepage editing administration", () => {
  it("redirects the legacy site settings URL to the admin dashboard", () => {
    SiteSettingsPage();
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("does not expose a homepage settings link in admin navigation", async () => {
    render(await AdminLayout({ children: <div>内容</div> }));
    expect(screen.queryByRole("link", { name: /首页|页面内容|站点设置/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "报告资料" })).toHaveAttribute("href", "/admin/modules");
  });

  it("keeps the dashboard focused on report content management", async () => {
    render(await AdminPage());
    expect(screen.queryByRole("link", { name: /首页|页面内容|站点设置/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "管理报告资料" })).toHaveAttribute("href", "/admin/modules");
  });
});
