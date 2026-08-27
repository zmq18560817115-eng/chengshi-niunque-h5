import { GET as getPdf } from "@/app/reports/pdf/[assetId]/route";
import { prisma } from "@/server/db/prisma";

describe("published report assets", () => {
  it("streams PDF data through the application without exposing the storage endpoint", async () => {
    const asset = await prisma.reportAsset.findFirst({
      where: {
        assetType: "PDF",
        contentStatus: "PUBLISHED",
        isOnline: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(asset).not.toBeNull();

    const response = await getPdf(
      new Request(`http://localhost/reports/pdf/${asset!.id}`, {
        headers: { Range: "bytes=0-15" },
      }),
      { params: Promise.resolve({ assetId: asset!.id }) },
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-range")).toMatch(/^bytes 0-15\//);
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
  });
});
