-- Preserve the second-stage behavior where external links open in a new page.
UPDATE "public"."ReportAsset"
SET "openMode" = 'NEW_TAB'
WHERE "assetType" = 'EXTERNAL_LINK';
