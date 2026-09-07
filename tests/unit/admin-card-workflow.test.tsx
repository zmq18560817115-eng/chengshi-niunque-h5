import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ManagedReportCard } from "@/server/services/admin-report-images-service";
const { publish, remove, refresh } = vi.hoisted(() => ({ publish: vi.fn(), remove: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/admin/report-image-actions", () => ({ publishReportImagesAction: publish, removeReportImagesAction: remove }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import { ReportImagesManager } from "@/components/admin/ReportImagesManager";
const card: ManagedReportCard = { id: "seed-card-inspection-safety", title: "安全底线", category: "检测项目", slug: "inspection-projects", href: "/reports/inspection-projects/items/seed-card-inspection-safety/reports", revision: "version-one", reports: [] };

describe("direct report image management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => "blob:preview"); static revokeObjectURL = vi.fn(); });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  function open() { fireEvent.click(screen.getByText("安全底线")); }
  it("keeps category and card copy read-only and maps each upload to its existing report page", () => {
    const { container } = render(<ReportImagesManager cards={[card]}/>); open();
    expect(screen.getByRole("link", { name: /查看前端对应页面/ })).toHaveAttribute("href", card.href);
    expect(container.querySelectorAll('input[type="text"], textarea, select')).toHaveLength(0);
    expect(container.querySelector('input[name="reportCardId"]')).toHaveValue(card.id);
    expect(screen.getByLabelText("选择报告图片")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(screen.getByRole("button", { name: "上传并发布" })).toBeDisabled();
  });
  it("publishes selected images in the reviewed order with the current card revision", async () => {
    publish.mockResolvedValue({ saved: true });
    render(<ReportImagesManager cards={[card]}/>); open();
    const first = new File(["a"], "first.png", { type: "image/png" });
    const second = new File(["b"], "second.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("选择报告图片"), { target: { files: [first, second] } });
    fireEvent.click(screen.getByRole("button", { name: "第 2 页上移" }));
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "安全底线上传报告图片" })));
    await waitFor(() => expect(publish).toHaveBeenCalledOnce());
    const form = publish.mock.calls[0][1] as FormData;
    expect(form.get("reportCardId")).toBe(card.id);
    expect(form.get("revision")).toBe("version-one");
    expect((form.getAll("files") as File[]).map((file) => file.name)).toEqual(["second.png", "first.png"]);
    expect(refresh).toHaveBeenCalled();
  });
  it("keeps the chosen images and reports a failed save", async () => {
    publish.mockResolvedValue({ error: "图片存储暂不可用" });
    render(<ReportImagesManager cards={[card]}/>); open();
    fireEvent.change(screen.getByLabelText("选择报告图片"), { target: { files: [new File(["a"], "report.png", { type: "image/png" })] } });
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "安全底线上传报告图片" })));
    expect(await screen.findByRole("alert")).toHaveTextContent("图片存储暂不可用");
    expect(screen.getByText(/report.png/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("requires a local confirmation before removing a specific report", async () => {
    remove.mockResolvedValue({ saved: true });
    render(<ReportImagesManager cards={[{ ...card, reports: [{ id: "asset-one", title: "安全检测报告", published: true, pages: [] }] }]}/>); open();
    fireEvent.click(screen.getByRole("button", { name: "移除这份报告" }));
    expect(remove).not.toHaveBeenCalled();
    await act(async () => fireEvent.submit(screen.getByRole("button", { name: "确认移除" }).closest("form")!));
    const form = remove.mock.calls[0][1] as FormData;
    expect(form.get("assetId")).toBe("asset-one");
    expect(form.get("reportCardId")).toBe(card.id);
  });
});
