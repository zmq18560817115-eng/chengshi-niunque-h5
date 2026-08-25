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

  it("renders the fixed brand guide at /go", () => {
    render(<GoPage/>);
    expect(screen.getByRole("heading", { name: "Honest Nutri 品牌引导" })).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName("进入档案");
    expect(screen.getByText("向上滑动，或点击下方提示进入档案")).toBeInTheDocument();
  });
});
