import { GET as getPdf } from "@/app/reports/pdf/[assetId]/route";

describe("published report assets", () => {
  it("permanently disables every legacy public PDF route without reading storage", () => {
    const response = getPdf();
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBeNull();
  });
});
