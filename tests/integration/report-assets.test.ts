import { GET as getPdf } from "@/app/reports/pdf/[assetId]/route";

describe("published report assets", () => {
  it("does not expose historical PDFs through a known public asset URL", () => {
    const response = getPdf();
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBeNull();
  });
});
