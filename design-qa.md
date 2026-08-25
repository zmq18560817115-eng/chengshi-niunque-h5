# Design QA

## Comparison Target

- Source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-e246eaf0-3fca-48ea-b34c-c24d86a08e97.png`
- Supplied click cue: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-6bd1e5b2-56cf-48a1-93cc-11f07db4e74c.gif`
- Supplied titles: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-933bb957-f85c-46fe-82c7-f86c89050f52.gif`, `C:/Users/bu/AppData/Local/Temp/codex-clipboard-f940eba3-2e23-4716-a9a9-f3d4496d50ef.gif`, and `C:/Users/bu/AppData/Local/Temp/codex-clipboard-9472c503-2ca1-4d69-965b-a7b841f2207c.gif`
- Browser-rendered implementation: `D:/chengshi-niunque-h5/design-qa-evidence/homepage-sections-after-supplement.png`
- Full-view comparison: `D:/chengshi-niunque-h5/design-qa-evidence/homepage-sections-comparison.png`
- Focused cue/title comparison: `D:/chengshi-niunque-h5/design-qa-evidence/homepage-sections-comparison-focus.png`
- Route/state: `/reports`, scroll position 1600, motion allowed, all four viewport-scoped GIF groups ready and visible.

## Viewport And Normalization

- Source pixels: 2000 x 4420 for the module-two reference, normalized to 750 x 1658.
- Browser capture pixels: 1500 x 8336 from the in-app browser screenshot surface.
- Browser override: 375 x 812 mobile reference; the app-owned archive canvas measured 750 CSS units on the doubled browser surface.
- Implementation crop: the app-owned `(0, 1622)-(750, 3280)` module-two region, producing 750 x 1658 pixels.
- Density normalization: the source was downsampled from its 2x export to the same 750 px artwork width as the implementation crop. Browser padding and the later brand-story section were excluded.

## Findings

- No actionable P0, P1, or P2 differences remain in the requested homepage adjustment.
- Fonts and typography: all three visible module names are the supplied raster GIF letterforms. Their alpha bounds are aligned to the original title pixels, so character weight, spacing, punctuation, and optical baseline match without font substitution.
- Spacing and layout rhythm: the cue, three number pairs, and three title GIFs match the 1000 x 5557 master-canvas positions inferred from the supplied 2000 x 4420 reference. The title and number parts do not overlap or drift outside their folder tabs.
- Colors and visual tokens: the supplied GIF colors and repository number-part colors are used without recoloring. The folder palette, paper texture, mascot, report copy, and global tokens are unchanged.
- Image quality and asset fidelity: the four supplied GIFs and six existing PNG parts are used directly at natural 0.5 scale. No CSS drawing, SVG approximation, glyph replacement, stretching, or generated substitute is present.
- Copy and content: the cue reads “点击”; the three title rows read ①检测项目, ②复核保障, and ③生产溯源. Existing mascot and body copy remain unchanged.
- Responsiveness and accessibility: all placement remains percentage-derived from the existing master canvas. The decorative assets stay `aria-hidden`, while the three existing semantic module buttons retain their labels, practical tap regions, and unchanged navigation coordinates.
- The focused side-by-side comparison shows the cue, number parts, title baselines, mascot, folder lips, and surrounding papers aligned to the source. Differences visible inside the title strokes are the requested replacement GIF artwork and its live frame state.

## Comparison History

1. The first implementation (`design-qa-evidence/homepage-sections-after-browser.png`) removed the plant decoration and mounted the four supplied GIFs, but used the former combined-GIF canvas origins. The supplemental reference exposed P2 position drift and the missing ①/②/③ parts.
2. The cue was moved to master `(533, 2545.5)`. The original resource 11/12, 14/15, and 17/18 ring/digit pairs were restored as six independent PNG layers. Each new title was aligned by visible alpha bounds to the source title position.
3. Post-fix full and focused comparisons show the cue and all three number/title rows aligned. Two browser captures 500 ms apart changed 68,414 pixels inside the module region, confirming that the supplied GIFs continue animating. No P0/P1/P2 findings remain.

## Interaction And Console Verification

- All three homepage module buttons were present and enabled after the visual replacement.
- Clicking the inspection module reached `/reports/inspection-projects`; browser back returned to `/reports` with all three buttons enabled.
- No console errors were recorded. One existing Next.js development-only LCP suggestion for `绿档.png` was present and is unrelated to this scoped visual change.
- Targeted tests passed for the removed decoration layers, four supplied GIF dimensions, six restored PNG dimensions, viewport preload/visibility behavior, reduced motion, title isolation, and unchanged module interactions.

## Open Questions

- None.

## Implementation Checklist

- [x] Remove the old green plant and bubble decoration.
- [x] Add the supplied animated click cue at the reference position.
- [x] Replace the three title GIFs with the supplied inspection/review/production effects.
- [x] Restore the repository's original ①/②/③ ring and digit parts at source size.
- [x] Preserve the mascot, folders, body copy, hotspots, routes, other pages, and existing motion lifecycle.

## Follow-up Polish

- No P3 visual polish is required for this scoped change.

final result: passed

---

# Design QA — Archive category route transition

## Scope and references

- Interaction: `/reports` green/yellow/brown module → matching category detail route.
- Supplied folder references: `codex-clipboard-709813b2-1a4f-41de-91f2-0ca9ebda7acb.png`, `codex-clipboard-e541ad05-f45b-4db1-b3c4-9caa1b0095e2.png`, and `codex-clipboard-a42fbbc1-20bf-4d7c-a6a3-e8e367f7ff7e.png`.
- Runtime artwork at the time of this motion check used the prior clean category canvases; the later visual replacement is documented in the next QA section and does not change these motion measurements.
- Settled browser evidence: `design-qa-evidence/category-transition-production-final.png` at the 375 × 812 mobile reference viewport.

## Motion verification

- All three homepage hotspots set the clicked slug before navigation. The destination consumes only its matching marker, preventing the new transition from appearing on direct category URLs.
- Homepage exit: `archive-category-exit-up-fade`, 220ms, upward distance `8dvh`, opacity 1 → 0.
- Category entry: `category-detail-enter-up-fade`, 560ms, initial distance `14dvh` below the settled canvas, opacity 0 → 1. The category artwork contains the folder and title region, so both move on the same fixed canvas without relative drift.
- Browser samples immediately after destination mount:
  - inspection: opacity `0.0888`, Y translation `186.5px`;
  - review: opacity `0.0898`, Y translation `186.3px`;
  - production traceability: opacity `0.0892`, Y translation `186.4px`.
- Each sample reported the same animation name and `0.56s` duration. Settled state reached opacity 1 and translation 0.
- Reduced-motion mode keeps the route relationship but uses a 150ms opacity-only handoff.

## Isolation and regression findings

- No P0, P1, or P2 differences remain in the requested transition.
- Existing folder/title artwork, homepage GIFs, mascot motion, scroll restoration, detail card hotspots, swipe-back gesture, and category-to-report navigation are unchanged.
- Direct category loads retain the existing generic entry; preview mode remains static.
- The development server compiled `/reports` and all three category routes successfully with HTTP 200 responses and no runtime error output.
- Targeted unit verification passed: 3 files, 60 tests. Lint and TypeScript checks passed before the full gate run.

final result: passed

---

# Design QA — Category detail visual replacement

## Comparison Target

- Source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-report-click-v825-20260825-1235/报告点击页面输出/报告点击页01.jpg`, `报告点击页02.jpg`, and `报告点击页03.jpg` from the supplied ZIP.
- Browser-rendered implementations: `D:/chengshi-niunque-h5/design-qa-evidence/category-detail-v825/implementation-inspection.png`, `implementation-review.png`, and `implementation-production.png`.
- Full-view combined evidence: `comparison-inspection-full.png`, `comparison-review-full.png`, and `comparison-production-full.png` in the same evidence directory.
- Focused card evidence: `comparison-inspection-cards.png`, `comparison-review-cards.png`, and `comparison-production-cards.png`.
- Routes/state: all three `/reports/[slug]` category pages, entry animation settled, live published card content, no hover or pressed state.

## Viewport And Normalization

- Each source export is 2000 x 4333 pixels and was downsampled to 750 x 1625 pixels.
- The in-app browser surface was 2560 x 1440 CSS pixels with a centered 750 px H5 canvas. Its full-page captures are 5120 x 3250 pixels; the app-owned centered 750 x 1625 canvas was cropped without rescaling.
- The source and implementation were therefore compared at the same 750 x 1625 normalized content size. Browser padding and the development indicator were excluded.
- The production H5 remains percentage-scaled from the same 750 px canvas to the project's 375 px reference width.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the folder titles and decorative writing are the supplied raster originals. Live card titles, descriptions, report counts, and accessible labels remain HTML and keep the existing typography rules so published admin content remains authoritative.
- Spacing and layout rhythm: the three full-page references share the source crop and vertical rhythm. All eight blank card backplates occupy their measured half-scale coordinates, and their live title, description, action, arrow, and status layers remain inside the corresponding card bounds.
- Colors and visual tokens: the green, yellow, and brown paper palettes, cream card surfaces, footer notes, and status accents come directly from the delivered assets without recoloring. Existing global tokens continue to style the live copy only.
- Image quality and asset fidelity: full reference JPGs, blank card PNGs, and the five separate review/production status-fish PNGs are used directly. No CSS illustration, inline SVG, generated substitute, or stretched sprite replaces visible supplied art.
- Copy and content: the source mock's fixed sample counts differ from the currently published report counts, and two published review descriptions are shorter. This is intentional and required to preserve the existing backend/admin linkage; the visual containers and alignment match while the live business data remains current.
- The focused comparisons were required because the full view makes typography and card-edge registration too small to judge. They confirm card edges, title baselines, description starts, button positions, status fish, and decorative arrows remain aligned.

## Comparison History

1. The first normalized full and focused comparisons used the delivered references on the left and the browser-rendered live pages on the right.
2. No P0/P1/P2 visual mismatch was found. The only visible content differences were traced to live published card values and classified as the requested backend-preserving behavior, so no visual change was made after the comparison.

## Interaction And Console Verification

- The inspection page exposed three enabled card hotspots. Clicking the first reached `/reports/inspection-projects/items/seed-card-inspection-nutrition/reports`; browser back restored the category page with all three hotspots enabled.
- Existing page-entry animation remained `h5-page-enter` on direct load. The separately verified archive-to-category upward-fade path was not changed by this visual work.
- The browser log contained no warning or error entries; only React development information and Fast Refresh logs were present.
- Full verification passed: lint, TypeScript, 22 test files / 112 tests, Prisma schema validation, and the production build.

## Open Questions

- None.

## Implementation Checklist

- [x] Use the three delivered full-page references for exact header, folder, texture, mascot, and footer composition.
- [x] Overlay the eight delivered blank card components at measured source positions.
- [x] Preserve live admin-managed card copy and report counts.
- [x] Preserve card clicks, report routes, swipe-back, entry motion, and server integration.
- [x] Remove retired category canvases and duplicate status-fish assets.

## Follow-up Polish

- No P3 visual polish is required for this scoped replacement.

final result: passed
