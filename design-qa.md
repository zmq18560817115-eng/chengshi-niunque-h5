# Design QA

## Sources of truth

- Category masters: `public/design/final-v1/category-inspection-clean.webp`, `category-review-clean.webp`, `category-traceability-clean.webp` (1000 x 2166).
- Formal category references: `docs/input/design/final-v1/references-最终效果/报告点击页-01.jpg`, `报告点击页-02.jpg`, `报告点击页-03.jpg` (2000 x 4333).
- Guide master/fallback: `public/design/guide/guide-first-frame.webp`, `guide-final-fallback.webp` (750 x 1625).
- Archive visual reference: `public/design/final-v1/archive-reference.webp` (1000 x 5557). Runtime static artwork uses untouched module-one/two parts plus the untouched complete module-three output slice; the flattened full-page reference is not rendered.
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

- [Fixed P1] The rollback version stretched every full-canvas raster independently with `object-fit: fill`. Background, character, mask and foreground now share one centered 750 x 1625 stage; each same-ratio image uses `contain`, while the stage itself cover-fits the viewport.
- [Fixed P1] SSR previously exposed the final fallback before returning to the animation start. SSR, hydration, and loading now hold the supplied `guide-first-frame.webp`; the decomposed animation starts from the same visual frame only after its assets are decoded.
- [Fixed P1] The supplied window mask must sit above the character and below the reports. Runtime order is background 10, arch 15, character 20, window mask 25, papers 30, foreground 35 and hint 40.
- Animation behavior is preserved: the existing 180ms handoff and all values in `motion-config.ts` remain unchanged.
- Fonts, colors, image copy and supplied raster artwork are unchanged. No CSS-drawn replacement was introduced.

**Browser evidence**

- System Chrome mobile emulation verified the guide at 375 x 667, 375 x 812, 390 x 844, 393 x 852, 414 x 896, and 430 x 932. The stage covers each viewport, its visual layers retain one transform, reduced motion shows only the final fallback, swipe navigation reaches `/reports`, and no console/page/request error was observed.

final result: passed

## Review-assurance title alignment verification — 2026-08-21

**Source visual truth**

- User-reported issue crop: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-3671f8e0-c06c-4043-92c1-8dab682a28d5.png` (438 x 160). It shows the right edge of `②复核保障` entering the green fold instead of remaining on the yellow tab.
- Approved runtime title asset: `public/design/final-v1/复核保障_逐字跳动.gif` (878 x 204). The supplied GIF is kept intact; no crop, redraw, mask, or replacement text is used.
- The yellow archive folder and adjacent layers remain the untouched repository artwork assembled by `ArchiveArtwork`.

**Implementation evidence**

- Full runtime viewport: `artifacts/qa-review-title-20260821/archive-review-title-375x812@2x.png` (750 x 1624 physical pixels from a 375 x 812 CSS viewport at device scale factor 2).
- Focused runtime crop: `artifacts/qa-review-title-20260821/review-title-implementation.png` (438 x 160).
- Same-pixel comparison, reported issue on the left and corrected runtime on the right: `artifacts/qa-review-title-20260821/review-title-source-vs-implementation.png` (876 x 160).
- Runtime report: `artifacts/qa-review-title-20260821/report.json`.

**State and findings**

- Normal-motion `/reports` state, scrolled to the second archive tab with the supplied GIF decoded and visible.
- The complete title canvas remains 439 x 102 master pixels at top 3165. Only its master left anchor changed from the previously shipped 62.5 to 25, placing the visible title within the yellow tab before the green fold.
- Browser geometry resolved to left 9.375 CSS px, width 164.625 CSS px at the 375px reference viewport, with one GIF instance, natural size 878 x 204, zero horizontal overflow, zero console errors, and zero failed responses.
- Iteration history: 62.5 still crossed the fold; 47.5 reduced but did not remove the overlap; 25 aligns the title's visible right edge with the yellow safe area in the same-size focused comparison.
- No other archive title, artwork layer, hotspot, animation timing, asset, copy, font, or color changed.

final result: passed

## Runtime and motion verification — 2026-08-20

**Source visual truth**

- The supplied final artwork remains the sole composition reference. `docs/input/` was kept read-only.
- The flattened full-page archive reference is no longer rendered. `ArchiveArtwork` positions byte-identical public runtime copies of the untouched module-one/two source parts on one 1000 x 5557 master; `docs/input/` remains read-only and excluded from production Docker builds. It uses the complete 2000 x 2365 repository output `完整长图-共三个模块_04.jpg` as the module-three part at 0.5 scale from `(0, 4374.5)`. The image is not cropped or modified. Module-two resources 11–19 (the retired static circle, number, and title layers) are omitted, and no runtime title-clean patch or hand-drawn replacement is used.
- The only visible archive title assets are the three supplied full-title GIF files: `检测项目_逐字跳动.gif`, `复核保障_逐字跳动.gif`, and `生产溯源_逐字跳动.gif`.
- Category cards use eight configured status mappings backed by seven unique supplied design-text images plus the shared supplied fish artwork.

**Implementation evidence**

- Archive title GIFs retain their original 2x canvases and map to the 1000 x 5557 master at `(486, 2788)`, `(87.5, 3165)`, and `(472, 3522.5)`. They preload only near the title region, mount only while visible, and fully unload offscreen.
- Reduced-motion, preview, disabled, timeout, and image-failure states never restore the retired static titles. In those states the title areas remain empty because the only title renderers are the supplied GIFs.
- Fish animation uses cropped source assets, starts only in its viewport region, and stops offscreen. Once the story assets are ready, its clean animation base is stable before the reveal trigger; the four-line reveal pauses offscreen and only records completion after 7.6 seconds of accumulated visible playback.
- Motion preload timeout is terminal, so a late resource resolution cannot revive a failed animation. Dynamic reduced-motion changes reset the Guide timeline and do not leave Fish or Story running offscreen.
- The Guide uses one 750 x 1625 stage across background, masks, character, papers, hints, and hit behavior. Category status art, card copy offsets, batch bubble, navigation targets, and archive hotspots remain mapped on their supplied master canvases.

**Browser and automated evidence**

- System Chrome checked `/go`, `/reports`, and all three category routes at 375 x 667, 375 x 812, 390 x 844, 393 x 852, 414 x 896, and 430 x 932: the 30 normal-motion route/viewport checks reported zero broken images, console/page/request errors, horizontal overflow, and archive-hotspot overlap.
- The layered-archive probe reported 26 repository source parts, zero `archive-reference.webp` instances, zero retired title parts, zero broken images, and a 375px document width in a 375px viewport. Combined reference/runtime captures show the complete module-three bottom texture and envelope without a seam; visible-state captures show exactly three GIFs with no title-clean patches or double image.
- Reduced-motion cold-start checks requested no Guide dynamic assets, archive GIFs, Fish patches, or Story patches. The Guide fallback remained visible and the archive title regions remained free of retired static text.
- Playwright mobile acceptance and category-alignment suites passed 16/16 scenarios, including Guide-to-archive navigation, all six phone sizes, category/report opening, and swipe-back behavior.
- Unit coverage passed 95/95 tests. `pnpm lint`, `pnpm typecheck`, `pnpm prisma:validate`, and `pnpm build` passed.
- Physical WeChat testing was not available in this environment; the evidence above uses system Chrome mobile emulation with touch input.

final result: passed

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

**Browser evidence**

- System Chrome screenshots and all six responsive route checks show the approved fish-status artwork without the former duplicate foreground badge; the card route and full-card hit target remain intact.

final result: passed
