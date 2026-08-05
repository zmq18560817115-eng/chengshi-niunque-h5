import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("brand guide", () => {
  it("renders the fixed brand entry with early-enter affordances", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: /每一份安心/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入档案" })).toBeInTheDocument();
    expect(screen.getByText("3 秒后自动进入")).toBeInTheDocument();
  });
});
