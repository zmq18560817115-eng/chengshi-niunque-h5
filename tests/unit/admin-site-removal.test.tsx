import { render, screen } from "@testing-library/react";
const { redirectMock, list } = vi.hoisted(() => ({ redirectMock: vi.fn(), list: vi.fn().mockResolvedValue([]) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/auth/request-session", () => ({ requireCurrentAdmin: vi.fn().mockResolvedValue({ displayName: "管理员" }) }));
vi.mock("@/server/services/latest-batch-service", () => ({ LatestBatchService: class { get() { return Promise.resolve({ regularBatch: "GD00046087", trialBatch: "GD00046086", inspectionDate: "2026-08" }); } } }));
vi.mock("@/server/services/admin-report-images-service", () => ({ AdminReportImagesService: class { list = list; } }));
vi.mock("@/app/admin/actions", () => ({ logoutAction: vi.fn(), publishLatestBatchAction: vi.fn() }));
vi.mock("@/app/admin/report-image-actions", () => ({ publishReportImagesAction: vi.fn(), removeReportImagesAction: vi.fn() }));
import AdminLayout from "@/app/admin/(protected)/layout";
import AdminPage from "@/app/admin/(protected)/page";
import SiteSettingsPage from "@/app/admin/(protected)/site/page";
import ModulesPage from "@/app/admin/(protected)/modules/page";

describe("single-page batch and report administration", () => {
  beforeEach(() => vi.clearAllMocks());
  it("places exactly the three batch fields and report uploads on the same page", async () => {
    render(await AdminPage());
    expect(screen.getByRole("textbox", { name: "正装批次号" })).toHaveValue("GD00046087");
    expect(screen.getByRole("textbox", { name: "试用装批次号" })).toHaveValue("GD00046086");
    expect(screen.getByRole("textbox", { name: /检测日期/ })).toHaveValue("2026-08");
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "报告图片" })).toBeInTheDocument();
  });
  it("navigates within one management page", async () => {
    render(await AdminLayout({ children: <div/> }));
    expect(screen.getByRole("link", { name: "报告图片" })).toHaveAttribute("href", "/admin#report-images");
    expect(screen.getByRole("link", { name: "公开批次" })).toHaveAttribute("href", "/admin#latest-batch");
    expect(screen.queryByRole("link", { name: "操作记录" })).not.toBeInTheDocument();
  });
  it("redirects old management levels to the corresponding section", async () => {
    await SiteSettingsPage();
    expect(redirectMock).toHaveBeenCalledWith("/admin#latest-batch");
    await ModulesPage();
    expect(redirectMock).toHaveBeenCalledWith("/admin#report-images");
  });
});
