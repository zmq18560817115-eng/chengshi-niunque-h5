import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import GoPage from "@/app/go/page";

const { redirect, router } = vi.hoisted(() => ({
  redirect: vi.fn(),
  router: { push: vi.fn(), prefetch: vi.fn() },
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => router }));

describe("brand guide", () => {
  it("redirects the root entry to the canonical /go route", () => {
    HomePage();
    expect(redirect).toHaveBeenCalledWith("/go");
  });

  it("renders the supplied loading buffer only while the guide assets are pending", () => {
    render(<GoPage/>);
    expect(screen.getByRole("main", { name: "页面加载缓冲" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "正在准备品牌引导" })).toHaveAttribute("src", expect.stringContaining("data-loading-buffer.gif"));
    expect(screen.queryByRole("heading", { name: "Honest Nutri 品牌引导" })).not.toBeInTheDocument();
  });
});
