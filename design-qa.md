# Design QA

## Scope

- Guide-to-home swipe handoff, including the guide exit, archive-book group, and delayed public-batch group.
- The three third-level category pages at width-limited, height-limited, and dynamically resized mobile viewports.
- Existing report interactions, page hierarchy, source artwork, and long-page scrolling after the transition.

## Evidence

- Handoff intermediate frame: `artifacts/design-qa/guide-to-archive-revealing-375x812.png`
- Handoff settled and scrolled: `artifacts/design-qa/archive-after-guide-375x812.png`
- Category pages after readiness and paint:
  - `artifacts/design-qa/category-inspection-375x896.png`
  - `artifacts/design-qa/category-review-375x896.png`
  - `artifacts/design-qa/category-production-375x896.png`
- Earlier approved comparison and report evidence remain in `artifacts/design-qa/`.

## Findings

- The guide clone and archive book share one 840 ms compositor-only transform/opacity curve. The screenshot taken during `revealing` shows both layers overlapping without an uncovered white frame.
- The public-batch group starts at 672 ms, exactly 80% of the 840 ms book entrance, and finishes before the page unlocks.
- The runtime loading poster/GIF is not mounted during guide continuity. Critical decoded surfaces are painted before reveal; lower-page artwork mounts in two later batches to avoid a decode spike.
- After the handoff, the guide buffer, route-lock attribute, and busy state are removed and normal long-page scrolling is restored.
- All category canvases now use the full safe-content width and preserve the approved 2000×4333 artwork ratio. Short screens scroll inside the fixed route shell; browser height changes do not rescale or shift cards.
- The three category screenshots retain the approved title, mascot, folder, card, status, and footer layer order. No flattened substitute artwork was introduced.
- 26 targeted mobile/category Playwright checks passed in Chrome, including 320–667 px widths, short embedded-browser heights, all three routes, the 80% handoff timing, loader suppression, and post-transition scrolling.

final result: passed
