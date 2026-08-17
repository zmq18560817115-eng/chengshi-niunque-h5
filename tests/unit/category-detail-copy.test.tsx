import { render, screen } from "@testing-library/react";
import { CategoryDetail } from "@/components/h5/CategoryDetail";
import type { PublicModule } from "@/server/services/public-content-service";

const moduleFixture: PublicModule = {
  id: "inspection",
  slug: "inspection-projects",
  title: "检测项目",
  description: null,
  cards: [{
    id: "nutrition",
    title: "核心营养含量",
    description: "DHA、ARA与安全检测说明。",
    buttonText: "查看2份报告",
    footerNote: null,
    assets: [],
  }],
};

describe("CategoryDetail dynamic card copy", () => {
  it("renders card copy as HTML sourced from public content", () => {
    const { container } = render(<CategoryDetail module={moduleFixture} preview />);

    expect(screen.getByText("核心营养含量")).toBeInTheDocument();
    expect(screen.getByText("DHA、ARA与安全检测说明。")).toBeInTheDocument();
    expect(screen.getAllByText("查看2份报告")).not.toHaveLength(0);
    expect(screen.getAllByText("已通过")).toHaveLength(2);
    expect(container.querySelector(".category-page-art")).toHaveAttribute("src", expect.stringContaining("category-inspection-clean.webp"));
  });

  it("uses artwork-matched fallback copy for empty slots", () => {
    render(<CategoryDetail module={moduleFixture} preview />);
    expect(screen.getByText("油脂新鲜度")).toBeInTheDocument();
    expect(screen.getByText("安全底线")).toBeInTheDocument();
  });
  it("maps card and copy coordinates directly from the shared 1000px master", () => {
    const { container } = render(<CategoryDetail module={moduleFixture} preview />);
    const firstCard = container.querySelector<HTMLElement>('.category-card-hotspot[data-index="0"]');

    expect(firstCard?.style.getPropertyValue("--category-card-x")).toBe("59");
    expect(firstCard?.style.getPropertyValue("--category-card-y")).toBe("527");
    expect(firstCard?.style.getPropertyValue("--category-copy-x")).toBe("66");
    expect(firstCard?.style.getPropertyValue("--category-copy-y")).toBe("76");
    expect(firstCard?.style.getPropertyValue("--category-copy-width")).toBe("716");
  });
});
