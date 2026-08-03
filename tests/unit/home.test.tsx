import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("H5 public content states", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the loading state while public content is pending", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<HomePage />);
    expect(screen.getByText("正在加载公开资料…")).toBeInTheDocument();
  });

  it("renders an error state when public content fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    render(<HomePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("公开资料暂时无法加载");
  });
});
