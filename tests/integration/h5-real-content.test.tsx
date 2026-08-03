import { fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "@/app/page";
import { GET } from "@/app/api/public/content/route";

describe("H5 real public content chain", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => GET()));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders seeded modules and enforces one expanded module", async () => {
    render(<HomePage />);

    const first = await screen.findByRole("button", { name: /检测项目/ });
    const second = screen.getByRole("button", { name: /复核保障/ });
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("营养成分检测")).toBeInTheDocument();

    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("营养成分检测")).not.toBeInTheDocument();
    expect(screen.getByText("复核流程")).toBeInTheDocument();

    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(within(screen.getByLabelText("公开资料模块")).queryByText("复核流程")).not.toBeInTheDocument();
  });
});
