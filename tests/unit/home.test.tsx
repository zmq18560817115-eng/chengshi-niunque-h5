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

  it("renders the guide immediately instead of fixing the loading buffer before it", () => {
    render(<GoPage/>);
    expect(screen.queryByRole("main", { name: "页面加载缓冲" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Honest Nutri 品牌引导" })).toBeInTheDocument();
  });
});
