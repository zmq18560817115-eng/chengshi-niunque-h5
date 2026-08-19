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
- Archive result-colour motion uses the original-pixel crop at master bounds `(63, 1820, 691, 1933)`. Only the 628 x 113 changing region is composited, and it shares the latest-circle trigger/root margin so the two motions remain one continuous sequence during scrolling.
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

## Guide layered-canvas verification — 2026-08-19

**Source visual truth**

- Initial state: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-aa9910f4-ec52-497c-933b-e1fbc42ef925.jpg` (2000 x 4333).
- Completed state: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-5a09925a-b296-446b-ba94-f0a9f0794e75.jpg` (2000 x 4333).
- CSS master canvas: 750 x 1625, device scale factor 1 for normalized offline comparison.
- Full-view comparison: `test-results/guide-mask-qa/reference-vs-unified-canvas-states.jpg`.
- Focused mask comparisons: `test-results/guide-mask-qa/reference-vs-mask-above-723x1024.jpg` and `reference-vs-mask-behind-723x1024.jpg`.

**Findings and fixes**

- [Fixed P1] The rollback version stretched every full-canvas raster independently with `object-fit: fill`. Background, character, mask and foreground now share one proportional `cover` mapping and a common center.
- [Fixed P1] Loading used a baked first-frame image while running used decomposed layers, causing a visible canvas swap. Loading and running now use the same background, arch, character, real window mask and foreground layers.
- [Fixed P1] The supplied window mask must sit above the character and below the reports. Runtime order is background 10, arch 15, character 20, window mask 25, papers 30, foreground 35 and hint 40.
- Animation behavior is preserved: the existing 180ms handoff and all values in `motion-config.ts` remain unchanged.
- Fonts, colors, image copy and supplied raster artwork are unchanged. No CSS-drawn replacement was introduced.

**Remaining blocker**

- Browser-runtime setup is blocked by a trusted-code-path dependency error, so a refreshed browser-rendered screenshot, six viewport captures, console check and live swipe verification could not be collected in this run. The local URL remains available for manual inspection.

final result: blocked

## Production traceability fish-badge verification — 2026-08-19

**Source visual truth**

- Current capture: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-50699630-d19b-401d-be4f-44f35336be04.png` (750 x 1448).
- Formal reference capture: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-a0cafdba-4fe6-47a0-86ec-cbac1c4bdf71.jpg` (2000 x 4333).
- Runtime category artwork: `public/design/final-v1/category-traceability-clean.webp`.

**Findings and fixes**

- [Fixed P1] The production artwork already contains the approved `已核验 / 已核对` fish badges. A second generic HTML badge had been layered above them, creating an enlarged duplicate during responsive scaling.
- The duplicate foreground badge is now suppressed only for production traceability; the original artwork badge remains the single visible source.
- Card title, description, report-button content, card routes and database-backed published-card ordering are unchanged.
- The entire card remains the click target.

**Remaining blocker**

- The same trusted-code-path browser-runtime error prevents a fresh browser screenshot and combined reference/prototype overlay in this run. Automated structure and build gates are used below, but final visual sign-off remains pending manual inspection.

final result: blocked
