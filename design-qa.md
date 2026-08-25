# Design QA

## Latest pass — Guide-to-homepage asset continuity

### Scope And Evidence

- Runtime path: `http://localhost:3000/go` → `http://localhost:3000/reports`.
- The loading buffer now waits for real image load and decode completion; the 12-second public-data fallback cannot bypass artwork preparation.
- Browser verification reached `/reports` with all 21 archive source layers present, `complete=true`, non-zero `naturalWidth`, and zero broken image URLs.
- All 11 previously deferred archive layers rendered with `loading="eager"`; the 10 first-screen priority layers remained high-priority images.
- Fresh browser warning/error log after the full transition was empty.

### Findings

- No actionable P0, P1, or P2 continuity issue remains.
- The previous global 12-second race could reveal the guide while large homepage images were still pending, and resolved preload promises did not retain decoded image objects. The browser could therefore request or decode individual archive parts again during the guide-to-homepage handoff.
- Homepage assets are now retained by their exact repository URLs, retried once on failure, and released only when the homepage unmounts. The `/reports` route is prefetched both at warm-up start and after artwork completion.
- Direct `/reports` visits also request every archive layer eagerly, preventing lower-page folders and decorations from appearing only after scrolling.
- No visual assets, coordinates, animation timing, route behavior, public API, admin field, Prisma model, or storage integration changed.

### Verification

- Regression coverage confirms that advancing beyond the 12-second data timeout does not remove the loading buffer while homepage image decodes remain pending.
- Existing warm-up coverage confirms that completing every image decode and the supplied loading playback still hands off to the unchanged guide page.
- Full verification passed: lint, TypeScript, 22 test files / 116 tests, Prisma schema validation, optimized production build, and the fresh-browser transition check.

final result: passed

---

## Latest pass — Equal title ② margins and opaque full-page continuity buffer

### Comparison Target

- Source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-4629b43a-dd11-4f6e-aa21-583b1cd23ddf.png` (414 x 196), showing the requested final ②-title placement inside the yellow tab.
- Browser implementation: `http://127.0.0.1:3000/reports` and the three `/reports/[slug]` detail routes.
- Same-state focused comparison: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v3/title-equal-margin-source-vs-browser.png`.
- Review transition filmstrip: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v3/slide-filmstrip.png`.
- Inspection transition filmstrip: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v3/inspection-slide-filmstrip.png`.
- Production transition filmstrip: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v3/production-slide-filmstrip.png`.
- State: normal motion preference, homepage scrolled to the module tabs, one module clicked, destination artwork allowed to report `complete` and non-zero `naturalWidth`, then the paired full-screen slide allowed to settle.

### Viewport And Normalization

- Browser viewport: 2560 x 1440 CSS pixels at device pixel ratio 1. The centered H5 canvas measured 750 CSS pixels wide, exactly twice the 375px reference width.
- Focused comparison: the supplied 414 x 196 crop and the equivalent browser-owned region were kept at the same 414 x 196 density and placed side by side; desktop chrome is excluded.
- Transition filmstrips: the app-owned `(905, 0)-(1655, 1440)` H5 viewport was cropped without rescaling, then reduced uniformly to 300 x 576 per sample. Frame labels are capture checkpoints rather than a frame-perfect video clock because screenshot capture consumes time.

### Findings

- No actionable P0, P1, or P2 differences remain in the requested correction.
- Fonts and typography: all three titles remain the supplied raster GIF/poster letterforms. The ② number and title move as a lockup, preserving glyph weight, baseline, punctuation, and the measured 22-master-unit internal clearance.
- Spacing and layout rhythm: review title group x=102, ring x=18.5, and digit x=36 produce a measured combined visible x-range of 18.5–461.5 inside the yellow tab's effective x-range of 0–480. The resulting 18.5-master-unit left and right insets are equal; the reference/implementation comparison shows no title pixel crossing onto the white paper.
- Colors and visual tokens: the yellow, green, and brown artwork remains untouched. The route handoff keeps both full pages at opacity 1, so no blend, grey flash, or washed-out texture is introduced.
- Image quality and asset fidelity: the transition buffer is a frozen clone of the already-rendered repository artwork, and the destination uses its existing supplied 2000 x 4333 page image. No placeholder, CSS drawing, generated art, or stretched screenshot is used.
- Copy and content: module headings, folder copy, detail-card copy, buttons, status labels, and backend-provided content are unchanged.
- Behavior and continuity: the complete old viewport stays fixed while the route and primary detail artwork load. When ready, old and new opaque viewports move upward together for 1600ms with a shared easing curve; one leaves by exactly `-100dvh` as the other enters from `100dvh`. The common edge remains covered for the entire handoff, removing the previous blank interval and double-exposed crossfade.
- Accessibility and responsiveness: semantic module buttons, tap regions, 375px scaling, reduced-motion handling, scroll restoration, and swipe-back behavior remain active. Reduced motion uses the existing short continuity fade instead of the long paired slide.

### Comparison History

1. The preceding overlap fade produced visible double exposure and could release the old page before the destination artwork was ready, creating the reported visual breakpoint.
2. A first DOM-buffer prototype still faded the old and new pages over each other and was rejected after filmstrip review because both headings and textures appeared simultaneously.
3. The final buffer captures the complete old viewport before module extraction, holds it without movement during route preparation, and releases only after the destination's primary image load signal is rendered.
4. The two opaque pages now use matching 1600ms full-viewport transforms. Review, inspection, and production filmstrips show the same continuous edge with no blank or double exposure.
5. The ② lockup moved another 15.5 master units left from the preceding state. Alpha-bound measurement now leaves exactly 18.5 master units at both ends of the usable yellow tab.

### Interaction And Console Verification

- Inspection reached `/reports/inspection-projects`; review reached `/reports/review-assurance`; production reached `/reports/production-traceability` through the shared buffer path.
- Inspection runtime samples showed the old page buffer present before route change, `data-route-entry="reports-archive-buffer"` only after the 2000px-wide destination artwork was complete, and buffer removal after the paired slide settled.
- Review and production filmstrips show a complete old page, a single opaque moving seam, and the complete destination page. No sampled frame exposes the desktop/canvas background.
- The title sequence remains one GIF plus two exact posters in repeating ①→②→③ order; its existing 3800ms play and 4000ms handoff timing was not changed.
- Historical hot-reload log entries were created while the transition module was replaced in place and are not reproducible in the compiled page. A fresh post-build browser tab completed all three routes with zero warning or error logs.
- Full verification passed: lint, TypeScript, 22 test files / 115 tests, Prisma schema validation, the optimized production build, and a fresh-browser interaction/console gate.

### Open Questions

- None.

### Implementation Checklist

- [x] Move the complete ② title lockup left until its yellow-tab end margins are equal.
- [x] Hold the complete old page until the selected detail artwork is ready.
- [x] Replace the ghosting crossfade with a slow, paired, opaque full-screen upward slide.
- [x] Apply one transition implementation to all three homepage modules.
- [x] Preserve all other homepage motion, detail-page content, interactions, and backend/admin linkage.
- [x] Pass the complete automated gates and a fresh-browser console check.

### Follow-up Polish

- No P3 visual polish is required for this scoped correction.

final result: passed

---

## Latest pass — Homepage-to-category continuity, title ② alignment, and 4-second sequence

### Comparison Target

- Source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-d1459075-b1d2-4e9c-ae2b-5779d26378c0.png` (2000 x 4420), the first reported current-state crop `C:/Users/bu/AppData/Local/Temp/codex-clipboard-3afa7f8f-c5a3-4aa9-bab7-7778f3765578.png` (380 x 132), and the final left-shift request `C:/Users/bu/AppData/Local/Temp/codex-clipboard-15d3ac87-549c-4cb9-be5d-54cd1fad9257.png` (450 x 150).
- Browser implementation: `http://127.0.0.1:3000/reports` and all three `/reports/[slug]` category routes.
- Full visible-viewport comparison: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v2/module-viewport-source-vs-browser.png`.
- Focused title comparison: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v2/review-left-supplement-source-vs-browser.png`; full browser capture: `review-title-left-final.png` in the same directory.
- Transition-state evidence: `D:/chengshi-niunque-h5/design-qa-evidence/route-continuity-v2/final-transition-filmstrip.png`.
- State: homepage scrolled to the three module tabs, normal motion preference, one title active at a time, then each module pressed and allowed to reach its matching detail route.

### Viewport And Normalization

- Browser viewport: 2560 x 1440 CSS pixels at device pixel ratio 1. The centered H5 canvas measured 750 CSS pixels wide and is the project's doubled 375px reference surface.
- Full comparison: source crop `(0, 440)-(2000, 4280)` was downsampled to 750 x 1440; the browser-owned H5 viewport was cropped from `(905, 0)-(1655, 1440)` without rescaling before both panels were reduced equally for the combined evidence.
- Focused title comparison: source crop `(0, 1840)-(1200, 2240)` and the equivalent browser H5 crop were normalized to matching 600 x 200 panels. Browser chrome and surrounding desktop canvas were excluded.
- Transition filmstrip: six app-owned H5 viewport samples show the selected homepage module exit, route handoff, and settled category page. Frame labels are sampling checkpoints rather than a frame-perfect video clock because screenshot capture itself consumes time.

### Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the three module titles remain supplied raster letterforms. The complete ②/title lockup moved left together, so glyph weight, internal spacing, and rendering remain unchanged.
- Spacing and layout rhythm: review-title group `(117.5, 3155.5)`, ring `(34, 3168)`, and digit `(51.5, 3181.5)` preserve the existing 22-master-unit ring/title clearance and baseline. The title's visible right edge is x=477, while the yellow folder boundary is x=480 or farther across the occupied title rows, so the entire lockup is contained in yellow. Folder lips, papers, mascot, heading, report-step copy, and module click regions remain at their existing coordinates.
- Colors and visual tokens: no palette, opacity token, texture, border, radius, or shadow was changed. Route continuity uses opacity only during motion; settled pages retain the supplied colors.
- Image quality and asset fidelity: the supplied title GIFs retain all 36 original frames, dimensions, and compressed image blocks. Only GIF frame-delay metadata changed; no illustration, logo, icon, texture, or title was redrawn or replaced.
- Copy and content: all fixed artwork copy and all live admin/backend card content remain unchanged.
- Behavior: navigation begins while the selected folder is still visible. Supported browsers retain the old page snapshot while the category page rises and fades in over it; the non-View-Transition fallback starts the category page at opacity 0.42 instead of a blank frame. Both paths avoid exposing the canvas background.
- Accessibility and responsiveness: semantic module buttons, labels, tap regions, keyboard behavior, reduced-motion handling, 375px reference scaling, and scroll restoration remain active. Reduced motion uses a short continuity fade beginning at opacity 0.72.

### Comparison History

1. The reported implementation had two P2 issues: title ② sat too close to its number ring, and the old route completed its extraction before a fully transparent category page mounted, exposing a visual break.
2. Source measurement placed the ② ring at original x=159–314 and the title at x=360–1025. At 0.5 master scale this required title group x=161; y=3155.5 preserves the source baseline. The folder, ring, digit, and click region were not moved.
3. Route handoff was changed from sequential hide-then-show to overlap: selected-module extraction is 520ms, navigation begins at 300ms, and old/new page snapshots share a 760ms upward fade. The fallback category entrance begins at non-zero opacity.
4. The first asynchronous handoff attempt waited for a passive effect and produced a browser timeout; this was a P1 runtime finding. Readiness now fires during the detail page layout commit, eliminating the wait cycle. A fresh browser session completed the route with the transition marker removed and no console error.
5. Post-fix combined visual evidence aligns title ② with the source. Browser filmstrip and computed pseudo-element styles confirm `category-route-old-overlap` and `category-route-new-overlap`, both at 0.76s, with no blank sample.
6. The final supplemental crop requested a further left shift. Pixel-boundary measurement showed the title's right edge crossing the yellow folder edge by up to 38.5 master units. The full ②/title lockup moved left 43.5 units, retaining its internal gap and leaving a 3-unit minimum inset; the new combined evidence shows no title pixel on the white paper.

### Interaction And Console Verification

- Detection, review, and production buttons each reached their matching category route through the shared overlap path.
- A clean review transition ended at `/reports/review-assurance`, removed `data-category-view-transition`, retained `data-route-entry="reports-archive-overlap"`, and produced no warning or error logs.
- A clean production sample reported `category-route-old-overlap` and `category-route-new-overlap`, each with `0.76s` duration; the marker cleared after completion.
- Fourteen one-second title samples returned ① for seconds 0–3, ② for 4–7, ③ for 8–11, then ① again. Every sample contained exactly one GIF and two posters.
- Each title GIF contains 36 frames, 20 delays of 110ms and 16 delays of 100ms for exactly 3800ms, no infinite-loop extension, and a 200ms final-frame hold before the 4000ms handoff.
- Browser layout inspection confirmed the final review group at the expected scaled coordinate, with every visible title asset loaded and the full lockup contained by the yellow tab.
- Full verification passed: lint, TypeScript, 22 test files / 115 tests, Prisma schema validation, and the optimized production build.

### Open Questions

- None.

### Implementation Checklist

- [x] Remove the blank visual interval between homepage module exit and category entry.
- [x] Reuse one upward-overlap transition for all three modules with a non-blank fallback.
- [x] Move the complete title ② lockup left while preserving its ring gap and baseline, fully containing it in the yellow folder.
- [x] Extend each title GIF to exactly 3.8 seconds and hand off every 4 seconds in repeating ①→②→③ order.
- [x] Preserve all other animation, artwork, routes, interactions, and backend/admin linkage.
- [x] Pass focused/full combined visual QA, interaction checks, console checks, automated gates, and production build.

### Follow-up Polish

- No P3 visual polish is required for this scoped correction.

final result: passed

---

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

# Design QA — Homepage title-two alignment and motion de-ghosting

## Comparison Target

- Focused source visual: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-559e59bd-49f7-4604-808a-776477d4a3b6.png`.
- Full-page source visual: `D:/chengshi-niunque-h5/design-qa-evidence/home-layout/reference-750.png`, normalized from the supplied 2000 x 10682 homepage reference.
- Browser evidence before correction: `D:/chengshi-niunque-h5/design-qa-evidence/title-motion-fix/review-active-before-viewport.png`.
- Browser evidence after correction: `D:/chengshi-niunque-h5/design-qa-evidence/title-motion-fix/review-active-after-viewport.png` and `review-inactive-final-viewport.png`.
- Combined focused evidence: `D:/chengshi-niunque-h5/design-qa-evidence/title-motion-fix/review-final-source-vs-browser.png`.
- Combined full-view evidence: `D:/chengshi-niunque-h5/design-qa-evidence/title-motion-fix/full-source-vs-browser.png`.
- Route/state: `/reports`, title region intersecting the viewport, normal motion preference, no module pressed.

## Viewport And Normalization

- Browser surface: 2560 x 1440 CSS pixels at device pixel ratio 1; the app-owned H5 canvas is centered at 750 CSS pixels wide.
- Full source and browser canvas are compared at 750 x 4006 pixels. The focused review-tab comparison uses the same feature scale and excludes desktop canvas padding.
- Active and inactive states were captured separately so position and layer composition could be judged without treating different GIF frames as layout drift.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Title ② alignment: the review title group is now at master `(161, 3155.5)`. The supplied ② ring/digit keeps its existing coordinate and size, while “复核保障” aligns with the source tab baseline and preserves the original ring/title clearance.
- De-ghosting: an active group renders only its GIF; inactive groups render only their exact frame-zero WebP posters. The previous simultaneous poster-plus-GIF composition cannot occur.
- Timing: each 36-frame GIF now distributes 100ms and 110ms frame delays for one exact 3800ms playthrough. The infinite-loop extension is removed, and the sequence hands off every 4000ms, leaving a 200ms final-frame hold instead of restarting or jumping before the next title.
- Assets, colors, raster letterforms, number pieces, click regions, folder layers, module extraction, route entry, and backend/admin content remain unchanged.

## Comparison History

1. Before correction, the active review group contained both `.archive-section-title-poster` and `.archive-section-title-gif`, producing two coincident title layers. Later source measurement also showed insufficient clearance between the ② ring and review lettering, and the original 1800ms looping asset restarted exactly at each sequence handoff.
2. The final group coordinate is `(161, 3155.5)`. Poster and GIF rendering remain mutually exclusive. Only GIF timing metadata and its loop extension changed; compressed frame pixels, canvas dimensions, and the 36 supplied frames were preserved.
3. The final focused source-versus-browser comparison aligns the review lettering with the source. Runtime sampling confirms one active GIF plus two inactive posters for the full repeating cycle.

## Interaction And Console Verification

- Fourteen consecutive one-second samples covered ①→②→③→①. Every sample reported exactly one GIF, two posters, and render layers matching the active title only; each title remained active for four samples before handoff.
- All three patched title files remain 36 frames at their original dimensions. Their 100ms/110ms delays total 3800ms, and no `NETSCAPE2.0` loop extension is present.
- Clicking ②复核保障 still reached `/reports/review-assurance`; browser back restored `/reports` with all three module buttons enabled.
- Browser warning/error log after the interaction was empty.
- Full verification passed: lint, TypeScript, 22 test files / 115 tests, Prisma schema validation, and the optimized production build.

## Open Questions

- None.

## Implementation Checklist

- [x] Align title ② to the supplied source without moving its number part.
- [x] Remove the active poster/GIF overlap that caused ghosting.
- [x] Lengthen each supplied title animation and prevent an end-of-loop jump.
- [x] Preserve the repeating ①→②→③ order and every existing route and interaction.
- [x] Verify focused and full-page combined evidence, browser behavior, tests, and production build.

## Follow-up Polish

- No P3 visual polish is required for this scoped correction.

final result: passed

---

# Design QA — Homepage top-whitespace correction

## Comparison Target

- Source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-a3d8bac3-0f05-4b14-84ca-a62df6e343fa.jpg`.
- Browser-rendered implementation before correction: `D:/chengshi-niunque-h5/design-qa-evidence/home-layout/implementation-before-h5.png`.
- Browser-rendered implementation after correction: `D:/chengshi-niunque-h5/design-qa-evidence/home-layout/implementation-after-h5.png`.
- Full-view combined evidence after correction: `D:/chengshi-niunque-h5/design-qa-evidence/home-layout/comparison-after-full.png`.
- Focused top and three-folder comparison: `D:/chengshi-niunque-h5/design-qa-evidence/home-layout/comparison-after-top.png`.
- Before-fix evidence: `comparison-before-full.png` and `comparison-before-top.png` in the same directory.
- Route/state: `/reports`, all 21 archive artwork layers loaded with non-zero natural widths, page-entry animation settled, title motion allowed, and no module pressed.

## Viewport And Normalization

- Source pixels: 2000 x 10682, normalized to 750 x 4006 for comparison with the app-owned H5 canvas.
- Browser viewport: 2560 x 1440 CSS pixels, device pixel ratio reported as 1, with the centered H5 canvas measuring 750 CSS pixels wide.
- Before-fix implementation canvas: 750 x 4167.75 CSS pixels, captured as the 750 x 4168 app-owned region.
- After-fix implementation canvas: 750 x 4005.75 CSS pixels, captured as the 750 x 4006 app-owned region.
- Density normalization: the source was downsampled by 2000/750; the implementation crop was retained at one image pixel per measured CSS pixel. Browser padding and surrounding desktop canvas were excluded.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the logo, hero title, batch copy, three folder titles, report steps, and brand-story copy remain the supplied raster artwork or the already-approved title GIF/poster assets. No font, weight, line-height, wrapping, or antialiasing rule changed.
- Spacing and layout rhythm: the source ratio is 1000 x 5341, while the previous runtime exposed the full 1000 x 5557 internal master and added 216 units above the intended visible composition. Cropping that exact amount from the shared parent aligns the book edge, evidence heading, all three folder lips, brown copy block, fish divider, and brand-story envelope with the reference without per-layer drift.
- Colors and visual tokens: all paper, yellow, green, brown, orange, pink, blue, and ink colors still come from the existing repository assets and current global tokens. No recoloring, opacity substitution, gradient, border, radius, or shadow was introduced.
- Image quality and asset fidelity: every existing raster layer is retained at its original scale. The fix changes only the visible parent canvas; no supplied asset was resized independently, recompressed, redrawn, or replaced with CSS/SVG/HTML art.
- Copy and content: all fixed artwork copy and all backend/admin-linked content remain unchanged.
- Icons and decorative marks: the supplied logo, paperclip, graduation cap, arrows, mascot, fish, folder tabs, and envelope remain source imagery with unchanged stacking order.
- Responsiveness and accessibility: the visible canvas keeps the project 375px reference behavior and 750px maximum width. All three semantic module buttons remain enabled, retain practical tap regions, labels, focus behavior, and percentage-based alignment inside the uniformly shifted internal canvas. The page has no horizontal overflow.

## Comparison History

1. The before-fix combined comparison exposed a P2 layout mismatch: the browser canvas was 750 x 4168 while the normalized source was 750 x 4006, leaving excessive cream space above the yellow archive and shifting every later section downward.
2. The fix introduced one shared `reports-archive-canvas` wrapper. Its original 1000 x 5557 coordinate space is preserved at 104.0432503277% of the outer height and shifted upward by 4.0432503277%, while the outer page uses the source-aligned 1000 x 5341 ratio.
3. The post-fix full and focused comparisons show matching page height and aligned section boundaries. Because the artwork, hotspots, triggers, and motion groups share the same parent, their relative registration remains unchanged. No P0/P1/P2 issue remains.

## Interaction And Console Verification

- A complete 11-second browser sample returned ③生产溯源 → ①检测项目 → ②复核保障 → ③生产溯源 → ①检测项目. Every sample contained exactly one active title GIF and exactly two inactive title posters.
- The three module hotspots measured 390–397.5 CSS pixels wide and 158.36–191.70 CSS pixels high on the 750px canvas, remaining aligned with their corresponding folder regions after the crop.
- Clicking ②复核保障 left the root transition disabled, applied `archive-selected-module-extract-up` only to the selected yellow folder/title group, left the green folder at `animation-name: none`, and reached `/reports/review-assurance`. Browser back restored `/reports`, the previous scroll region, and all three buttons.
- All archive images reported complete with non-zero natural widths before the final capture. Browser logs contained only React development and Fast Refresh information; no warnings or errors were present.

## Open Questions

- None.

## Implementation Checklist

- [x] Match the visible homepage height to the 2000 x 10682 source ratio.
- [x] Remove the excessive top whitespace with one parent-level crop.
- [x] Preserve all artwork coordinates, title sequencing, selected-module extraction, hotspots, routes, and backend linkage.
- [x] Verify the full page and focused top/module regions in combined source-versus-implementation evidence.

## Follow-up Polish

- No P3 visual polish is required for this scoped correction.

final result: passed

---

# Design QA — Loading buffer, review title, and selected-module extraction

## Comparison Target

- Loading source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-6d2cd344-ee0c-43c9-9594-c7c6166d48b3.gif`.
- Review-title issue evidence: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-31a053c2-28c6-4f73-8919-ab7a237b4fec.png`.
- Browser-rendered implementations: `D:/chengshi-niunque-h5/design-qa-evidence/loading-and-module-exit/loading-buffer.png` and `D:/chengshi-niunque-h5/design-qa-evidence/loading-and-module-exit/archive-after.png`.
- Full-view combined evidence: `D:/chengshi-niunque-h5/design-qa-evidence/loading-and-module-exit/loading-source-vs-browser.png`.
- Focused review-title evidence: `D:/chengshi-niunque-h5/design-qa-evidence/loading-and-module-exit/review-title-issue-vs-fixed-aligned.png`.
- Interaction-sequence evidence: `D:/chengshi-niunque-h5/design-qa-evidence/loading-and-module-exit/review-transition-sequence.png`.
- Routes/state: `/go` during loading and after handoff; `/reports` before and during a selected review-module exit; all three category destination routes with motion allowed.

## Viewport And Normalization

- Loading GIF source: 2000 x 4334 pixels, 45 frames at 80ms each, one 3600ms loop.
- Browser viewport and implementation capture: 2560 x 1440 CSS pixels, device pixel ratio 1, screenshot 2560 x 1440 pixels.
- Loading comparison normalization: source GIF frame 6 was rendered with the production `object-fit: cover` rule and both source and browser capture were normalized to 1280 x 720 before being placed in one 2560 x 764 comparison. This removes animated-frame timing, density, and crop differences from the visual judgment.
- Review issue source: 424 x 182 pixels. The browser region was cropped at the same visible feature scale from the centered 750px archive canvas and normalized to 424 x 182. Browser canvas padding was excluded.
- The archive full-page evidence is 5120 x 8336 pixels; the interaction sequence uses the app-owned centered 750 x 1440 region, normalized to three equal 375 x 720 panels.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the loading copy and all three module titles are unchanged supplied raster letterforms. The review-title artwork is now at final master coordinate `(161, 3155.5)`, while the independent ② part retains its original absolute position; no font, weight, line-height, or glyph substitute was introduced.
- Spacing and layout rhythm: the fixed review title remains inside the yellow folder tab and maintains clearance from the ring, character, and right paper. On click, only the selected folder and its title/number group move; the archive root and the two other folder layers retain their settled coordinates.
- Colors and visual tokens: the loading screen, green/yellow/brown folders, title colors, paper textures, and detail pages remain the supplied artwork. The only new motion values use the existing route easing token.
- Image quality and asset fidelity: the production loading GIF is a byte-identical repository copy. The reduced-motion poster is an exact first-frame WebP derivative. No CSS illustration, inline SVG, emoji, placeholder, or generated substitute is used.
- Copy and content: the loader still reads “正在公开你的营养信息…”, and the three module names remain 检测项目、复核保障、生产溯源. Existing live detail copy and backend-provided values are unchanged.
- Responsiveness and accessibility: the loader fills the current guide viewport with the same cover behavior as the guide, exposes loading status and alt text, and uses a static poster for reduced motion. Existing semantic module buttons, labels, tap regions, keyboard behavior, and routes remain active.

## Comparison History

1. The attached review crop showed the title visibly displaced to the right and low inside the yellow tab. This was recorded as a P2 alignment mismatch. The prior archive route transition also moved and faded the whole homepage, which did not meet the requested selected-module extraction behavior.
2. `section-title-review.gif` was moved to the final source-aligned `(161, 3155.5)` without moving the ② source parts. The clicked folder layer and matching title/number group now share `archive-selected-module-extract-up` at 15dvh over 520ms before the overlapping route handoff.
3. Post-fix combined evidence shows the loading frame matching the supplied GIF, the review title corrected within the folder tab, and the selected yellow folder absent from its settled position mid-transition while the green and brown folders remain fixed. No P0/P1/P2 findings remain.

## Interaction And Console Verification

- `/go` initially showed the supplied GIF at natural size 2000 x 4334 and did not mount `BrandGuide`. After the complete 3600ms playback and 260ms exit, the loader was absent and the existing guide mounted in its ready/animating state.
- During loading, `/reports`, `/api/public/content`, the guide artwork, all 21 archive layers, and the homepage motion/title assets were warmed; the 12000ms timeout remains a fail-open fallback.
- Browser sampling across one complete 11-second window returned the repeating ①→②→③ order. Every one-second sample contained exactly one `.archive-section-title-gif` and two static title posters, confirming that no active title has a duplicate poster layer.
- After entering `/reports` from the ready guide, all 21 `reports-archive-source-layer` images reported `complete=true` with non-zero natural widths on the first sampled homepage frame; no progressive layer gap was observed.
- Review mid-transition: root animation `none`; selected folder and title animation `archive-selected-module-extract-up`; sampled transform `translateY(-255.608px)` and opacity `0.0927`; inspection folder animation `none`. The destination reached `/reports/review-assurance` with the existing `category-detail-enter-up-fade` animation.
- Inspection and production were also clicked in the in-app browser. Each set its own slug, animated only its folder and title group, left both non-selected folders at animation `none`, and reached its existing category route.
- Console errors checked: none. Existing Next.js development-only LCP suggestions for delivered artwork remain warnings and are unrelated to this change.
- Full verification passed: lint, TypeScript, 22 test files / 115 tests, Prisma schema validation, and the optimized production build.

## Open Questions

- None.

## Implementation Checklist

- [x] Place the supplied loading buffer before the guide and warm public data, guide assets, and all homepage artwork/motion assets.
- [x] Keep inactive titles on exact frame-zero posters and mount only one 3800ms single-run title GIF at a time in the repeating ①→②→③ order, with a 4000ms handoff interval.
- [x] Preserve the full GIF loop and add reduced-motion/failure fallbacks.
- [x] Correct the review title without moving the existing ② part.
- [x] Extract only the clicked folder and matching title/number group for all three modules.
- [x] Preserve destination entry motion, routes, other page animation, backend linkage, and admin-managed content.

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
- Category entry fallback: `category-detail-enter-up-fade`, 760ms, initial distance `8dvh` below the settled canvas, opacity .42 → 1. Supported browsers use the 760ms old/new root overlap instead. The category artwork contains the folder and title region, so both move on the same fixed canvas without relative drift.
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
