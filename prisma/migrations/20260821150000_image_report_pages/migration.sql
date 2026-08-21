CREATE TABLE "ReportAssetPage" (
    "id" TEXT NOT NULL,
    "reportAssetId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" BIGINT,
    "pageNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportAssetPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportAssetPage_reportAssetId_pageNumber_key" ON "ReportAssetPage"("reportAssetId", "pageNumber");
CREATE INDEX "ReportAssetPage_reportAssetId_pageNumber_idx" ON "ReportAssetPage"("reportAssetId", "pageNumber");

ALTER TABLE "ReportAssetPage"
ADD CONSTRAINT "ReportAssetPage_reportAssetId_fkey"
FOREIGN KEY ("reportAssetId") REFERENCES "ReportAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing single-image reports become one-page reports without changing their public identity.
INSERT INTO "ReportAssetPage" ("id", "reportAssetId", "storageKey", "mimeType", "byteSize", "pageNumber", "createdAt", "updatedAt")
SELECT 'legacy-page-' || "id", "id", "storageKey", COALESCE("mimeType", 'image/jpeg'), "byteSize", 1, "createdAt", "updatedAt"
FROM "ReportAsset"
WHERE "assetType" = 'IMAGE' AND "storageKey" IS NOT NULL;
