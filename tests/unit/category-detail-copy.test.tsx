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

const traceabilityModuleFixture: PublicModule = {
  id: "traceability",
  slug: "production-traceability",
  title: "生产溯源",
  description: null,
  cards: [
    { id: "qualification", title: "生产资质", description: null, buttonText: "查看2份报告", footerNote: null, assets: [] },
    { id: "quality", title: "质量管理", description: null, buttonText: "查看3份报告", footerNote: null, assets: [] },
  ],
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

    expect(firstCard?.style.getPropertyValue("--category-card-x")).toBe("63");
    expect(firstCard?.style.getPropertyValue("--category-card-y")).toBe("529");
    expect(firstCard?.style.getPropertyValue("--category-copy-x")).toBe("58");
    expect(firstCard?.style.getPropertyValue("--category-copy-y")).toBe("76");
    expect(firstCard?.style.getPropertyValue("--category-copy-width")).toBe("742");
  });

  it("replaces legacy seed placeholders while preserving explicit managed copy", () => {
    const legacyModule = {
      ...moduleFixture,
      cards: [{ ...moduleFixture.cards[0], title: "第1项资料", description: "资料整理中，正式发布后可在此查看。", buttonText: "查看报告" }],
    };
    render(<CategoryDetail module={legacyModule} preview />);
    expect(screen.getByText("核心营养含量")).toBeInTheDocument();
    expect(screen.getAllByText("查看2份报告")).not.toHaveLength(0);
    expect(screen.queryByText("第1项资料")).not.toBeInTheDocument();
  });

  it("keeps production status metadata without adding another visual badge layer", () => {
    const { container } = render(<CategoryDetail module={traceabilityModuleFixture} preview />);
    const statusLabels = [...container.querySelectorAll<HTMLElement>(".category-card-status")];

    expect(statusLabels).toHaveLength(2);
    expect(statusLabels.map((label) => label.textContent)).toEqual(["已核验", "已核对"]);
    expect(statusLabels.every((label) => label.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(statusLabels.every((label) => label.closest(".category-card-hotspot"))).toBe(true);
  });
});
