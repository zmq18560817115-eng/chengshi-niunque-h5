import { GET as getPdf } from "@/app/reports/pdf/[assetId]/route";

describe("published report assets", () => {
  it("does not expose legacy PDF documents from the public H5", async () => {
    const response = await getPdf();

    expect(response.status).toBe(410);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
