import { fireEvent, render, screen } from "@testing-library/react";
import ReportsError from "@/app/reports/error";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
}));

describe("ReportsError", () => {
  it("offers branded retry and fixed archive recovery paths", () => {
    const reset = vi.fn();
    render(<ReportsError error={new Error("database unavailable")} reset={reset}/>);

    expect(screen.getByRole("alert")).toHaveTextContent("诚实纽雀");
    expect(screen.getByRole("alert")).toHaveTextContent("档案暂时没有加载出来");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(reset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "返回档案首页" }));
    expect(navigation.replace).toHaveBeenCalledWith("/reports");
  });
});
