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
    expect(screen.getByText("查看2份报告")).toBeInTheDocument();
    expect(container.querySelector(".category-page-art")).toHaveAttribute("src", expect.stringContaining("category-inspection-clean.webp"));
  });

  it("keeps empty card slots usable without baking placeholder text into artwork", () => {
    render(<CategoryDetail module={moduleFixture} preview />);
    expect(screen.getByText("第2项资料")).toBeInTheDocument();
    expect(screen.getAllByText("资料整理中，正式发布后可在此查看。")).toHaveLength(2);
  });
});
