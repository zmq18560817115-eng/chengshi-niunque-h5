import { render } from "@testing-library/react";
import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { PublicContentService } from "@/server/services/public-content-service";

describe("H5 real public content chain", () => {
  it("renders every published module as a whole clickable category", async () => {
    const content = await new PublicContentService().getContent();
    const { container } = render(<ReportsArchive modules={content.modules} />);
    for (const category of content.modules) {
      const hotspot = container.querySelector<HTMLButtonElement>(`[data-slug="${category.slug}"]`);
      expect(hotspot).toBeInTheDocument();
      expect(hotspot).toHaveAccessibleName();
    }
  });
});
