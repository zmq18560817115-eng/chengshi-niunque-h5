import { render, screen } from "@testing-library/react";
import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { PublicContentService } from "@/server/services/public-content-service";

describe("H5 real public content chain", () => {
  it("renders every published module as a whole clickable category", async () => {
    const content = await new PublicContentService().getContent();
    render(<ReportsArchive modules={content.modules} />);
    for (const category of content.modules) {
      expect(screen.getByRole("button", { name: new RegExp(category.title) })).toHaveAttribute("data-slug", category.slug);
    }
  });
});
