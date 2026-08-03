# Architecture

## Objective and system shape

This stage builds a replaceable mobile-first foundation, not final visuals or production workflows. One Next.js repository contains the public H5 (`/`), admin shell (`/admin`, `/admin/login`), Route Handler APIs (`/api`), Prisma/PostgreSQL persistence, and an S3-compatible storage boundary. Local infrastructure is PostgreSQL + MinIO in Compose; future deployment is Nginx -> Next.js -> PostgreSQL/object storage.

## Boundaries

- Route components compose sections; `src/components/h5` and `src/components/admin` own presentation.
- `src/server` owns future authorization, publication, audit, persistence, and storage adapters.
- Prisma records are not public API contracts. Uploaded files are referenced by storage keys, never stored as database bytes.
- `/api/health` reports application liveness only at this stage.

## H5 components

`HeroIntro` reserves first-screen animation state; `EvidenceOverview` represents the three-evidence transition; `InformationModules` holds the three entries; `ModuleDetail` is the inline expansion shell; `ReportCard` and `ReportViewer` reserve metadata and PDF/image/link modes; `BrandStory` and `PageFooter` close the page. Complex animation is deferred.

## Admin reservation

The shell reserves login, dashboard, information modules, report cards, files, preview, publish/offline, publish history, and audit history. Authentication and CRUD are out of scope for this stage.

## Testing and deployment

Vitest covers page structure and the health handler; Playwright provides separate smoke tests. Required gates are ESLint, TypeScript, Vitest, Prisma validation, Next build, and Compose parsing. `compose.yaml` runs local dependencies only; `compose.production.yaml` and `deploy/nginx/default.conf` reserve future topology without real hosts or credentials.
