# Data Model Draft

`prisma/schema.prisma` is the authoritative draft; this stage creates no migration.

- `AdminUser`: operator identity, hash-only password, active/disabled status; relates to content, uploads, publications, and audits.
- `InformationModule`: ordered public section with draft/published/offline lifecycle and creator/updater; owns cards.
- `ReportCard`: ordered module child with the same lifecycle and operator tracking; owns assets.
- `ReportAsset`: ordered PDF/image/external-link record with storage key or URL, uploader, and online state.
- `PublishVersion`: immutable JSON publication snapshot, publisher, time, status, and optional rollback source.
- `AuditLog`: append-oriented action with operator, target, version, detail, IP, and timestamp.
- `SiteSetting`: unique key/value content with lifecycle and operator tracking.

`sortOrder` is ascending within the parent. `contentStatus`, `isOnline`, `publishedAt`, and `offlineAt` represent editorial visibility. `createdAt`/`updatedAt` are persistence timestamps. Application validation will enforce the correct source field for each asset type and consistent status/online flags. Hard versus soft deletion remains open.
