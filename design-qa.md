# Design QA

## Sources of truth

- Category masters: `public/design/final-v1/category-inspection-clean.webp`, `category-review-clean.webp`, `category-traceability-clean.webp` (1000 x 2166).
- Guide master/fallback: `public/design/guide/guide-first-frame.webp`, `guide-final-fallback.webp` (750 x 1625).
- Archive master: `public/design/final-v1/archive-reference.webp` and the full-canvas motion layers under `public/design/final-v1/motion/archive-clean/` (1000 x 5557).
- User device captures supplied on 2026-08-13 were used to identify the category copy drift and ribbon seam.

## Implementation evidence

- `test-results/category-visual-alignment/inspection-projects-375.png`
- `test-results/category-visual-alignment/inspection-projects-390.png`
- `test-results/category-visual-alignment/inspection-projects-414.png`
- `test-results/category-visual-alignment/review-assurance-375.png`
- `test-results/category-visual-alignment/review-assurance-390.png`
- `test-results/category-visual-alignment/review-assurance-414.png`
- `test-results/category-visual-alignment/production-traceability-375.png`
- `test-results/category-visual-alignment/production-traceability-390.png`
- `test-results/category-visual-alignment/production-traceability-414.png`
- `test-results/current-visual-fix/guide-start-390.png`
- `test-results/current-visual-fix/guide-middle-390.png`
- `test-results/current-visual-fix/guide-final-390.png`

## Overlay and interaction review

- Category card rectangles and copy layers use raw 1000 x 2166 master pixels converted by container query units. The 9-case Chromium check verified each card and copy origin at 375, 390, and 414px with no horizontal overflow.
- Guide papers share one 420ms start and one 1500ms duration. Only transform and opacity vary; final coordinates remain the approved artwork coordinates.
- Archive ribbon uses the pixel seam at y=1678 and reveals continuously to y=1951. The short head and moving body do not overlap.
- Fish canvases use the archive 1000 x 5557 origin. Browser inspection confirmed the module changes from `is-ready` to `is-visible` when its trigger enters the viewport.
- No new horizontal overflow or layout-height animation was introduced.

## Deviations

- Category copy remains HTML so the management backend can update titles and descriptions. It is aligned inside the supplied paper regions rather than baked into the artwork.
- Motion frames intentionally differ from the final reference only during animation; all completed states return to the reference coordinates.

## Final QA result

passed
