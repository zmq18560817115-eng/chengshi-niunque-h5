import { prisma } from "@/server/db/prisma";

describe("PostgreSQL integration", () => {
  it("contains all migrated business tables", async () => {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    expect(tables.map((table) => table.tablename)).toEqual(
      expect.arrayContaining([
        "AdminUser",
        "InformationModule",
        "ReportCard",
        "ReportAsset",
        "ReportAssetPage",
        "PublishVersion",
        "AuditLog",
        "SiteSetting",
      ]),
    );
  });
});
