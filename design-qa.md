# Design QA

## Sources of truth

- Category masters: `public/design/final-v1/category-inspection-clean.webp`, `category-review-clean.webp`, `category-traceability-clean.webp` (1000 x 2166).
- Formal category references: `docs/input/design/final-v1/references-最终效果/报告点击页-01.jpg`, `报告点击页-02.jpg`, `报告点击页-03.jpg` (2000 x 4333).
- Guide master/fallback: `public/design/guide/guide-first-frame.webp`, `guide-final-fallback.webp` (750 x 1625).
- Archive master: `public/design/final-v1/archive-reference.webp` and the full-canvas motion layers under `public/design/final-v1/motion/archive-clean/` (1000 x 5557).
- User device captures supplied on 2026-08-13 and 2026-08-17 were used to identify the category copy drift and ribbon seam.

## Implementation evidence

- Existing responsive evidence: `test-results/category-visual-alignment/`.
- Current category reference, implementation, overlay, and difference images: `test-results/category-visual-acceptance/`.
- Current eight-viewport category results: `test-results/category-visual-acceptance/viewport-results.json`.
- Guide motion frames: `test-results/current-visual-fix/guide-start-390.png`, `guide-middle-390.png`, `guide-final-390.png`.
- Current 375 x 812 user-flow captures: `docs/audit-2026-08-18-mobile-user/flow-inspection-projects-375x812.png` and `flow-review-assurance-375x812.png`.

## Overlay and interaction review

- Category card rectangles and copy layers use raw 1000 x 2166 master pixels converted by container query units.
- Current 24-case Chromium inspection covers three category pages at 320, 360, 375 x 667, 375 x 812, 390, 393, 414, and 430px; all retain the expected slot count and have no horizontal overflow.
- Category title, description, report button, arrow, and status label now follow the reference master coordinates.
- The first two category pages reuse the original transparent status-text artwork. Page one is `已通过 / 符合标准 / 已通过`; page two is `已核对 / 已留档 / 持续关注`, matching `报告点击页-01.jpg` and `报告点击页-02.jpg` without browser-font substitution.
- Backend card title, description, and button text take priority. Reference copy is used only for an empty fixed slot, so category and report maintenance remains data-driven.
- Each complete card remains the click target; visual copy, arrow, and status layers do not intercept pointer events.
- Guide papers share one 420ms start and one 1500ms duration. Only transform and opacity vary; final coordinates remain the approved artwork coordinates.
- Archive ribbon uses the pixel seam at y=1678 and reveals continuously to y=1951. The short head and moving body do not overlap.
- Fish canvases use the archive 1000 x 5557 origin. Browser inspection confirmed the module changes from `is-ready` to `is-visible` when its trigger enters the viewport.

## Deviations

- Category copy remains HTML so the management backend can update titles and descriptions. Its font outline cannot be pixel-identical to baked artwork, but its baseline, size, wrapping, and placement are aligned inside the supplied paper regions.
- The home/archive composition intentionally remains a vertically scrollable long image. Acceptance is based on full-width fitting and zero horizontal overflow, not one-screen height.
- Motion frames intentionally differ from the final reference only during animation; completed states return to the reference coordinates.

## Deployment review

- The production build succeeds and emits all public, report, and admin routes.
- `compose.yaml` currently defines PostgreSQL and MinIO only, while `deploy/nginx/default.conf` expects an `app:3000` service. A company-server deployment therefore still needs explicit application/nginx service wiring or an external application process.
- This workstation could not reach PostgreSQL at `localhost:5432`, so live publish/filter integration and `prisma migrate status` must be repeated in the deployment environment.

## Final QA result

- Category visual implementation: **passed**.
- First and second category status identifiers: **passed** against the supplied original artwork.
- Mobile-width acceptance: **passed** at 375 x 667, 375 x 812, 390 x 844, 393 x 852, 414 x 896, and 430 x 932.
- Full deployment readiness: **conditional** on database/object-storage connectivity, migration status, and application service wiring.
