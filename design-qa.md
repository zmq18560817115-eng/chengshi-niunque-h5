# Design QA

## Comparison target

- Source visual truth: user-supplied `C:/Users/bu/AppData/Local/Temp/codex-clipboard-223bb4ab-5934-4e9b-9464-e5212e8c160d.jpg` (local reference only; not committed).
- Source dimensions: 2000×4333 pixels, normalized to the repository's 750×1625 guide coordinate plane (the same 6:13 ratio).
- Implementation route: `http://127.0.0.1:3420/go` from the optimized local production build.
- Implementation capture: Codex in-app browser visual capture of `/go`; browser/device chrome excluded from comparison.
- States inspected: decoded guide at rest, the guide-to-home click handoff, and the settled `/reports` page.

## Evidence and findings

- The reference and implementation were judged as the same full-frame composition, with particular attention to the logo, loose papers, character, report envelope, heart, arrow, and bottom instruction.
- Both portrait layout profiles now use the same centered 750×1625 scene. Runtime measurement showed a 750×1625 scene with zero horizontal document overflow; every full-canvas layer reported a 750×1625 natural size and the same rendered bounds.
- The prior compact-only crop layout is no longer mounted. It had independently repositioned the character and envelope, which caused the visible mismatch and a geometry jump during route handoff.
- Typography and copy remain original raster artwork. No substitute type, HTML reconstruction, crop, or invented graphic was introduced.
- Color and texture remain the repository's original guide assets. Images are proportionally contained as one 6:13 canvas rather than stretched to fill a non-matching viewport.
- The live guide layers and the predecoded route snapshot now share the same coordinate plane, so the transition does not switch to a differently positioned composition.
- The right-side loose paper animation now finishes at its registered source coordinate (`translate3d(0,0,0)`), avoiding a second position jump when animation ends.
- The click handoff reached `/reports`, settled with the continuity buffer removed, had zero horizontal overflow, and produced no browser warning/error logs. No white or texture-only frame was observed in the in-app browser walk-through.

## Comparison history

1. Pre-fix compact portrait: logo, character, envelope, and instruction were separate crops with viewport-relative positions. Against the supplied 6:13 reference, the character and envelope were visibly too high and the envelope covered the character at the wrong layer.
2. First fix: removed the compact crop composition and reused the original full-canvas semantic layers for both portrait profiles.
3. Handoff fix: replaced the compact route crop snapshot with the same 750×1625 static portrait snapshot and made the right paper animation end at its source coordinate.
4. Post-fix check: the implementation visually follows the supplied full-frame reference, keeps all layers registered to one canvas, and remains centered without distortion or horizontal overflow.

## Responsive contract

- Reference canvas: 750×1625 (6:13).
- Portrait sizing: `width: min(100cqw, 46.153846cqh)` with `aspect-ratio: 6 / 13`, centered on both axes.
- Wider or shorter portrait viewports may show narrow background-texture gutters. This preserves the complete original artwork and prevents the layer displacement caused by stretching/cropping.
- Landscape retains its existing dedicated semantic composition; this change does not invent a new landscape layout.

## Verification

- Automated unit coverage checks shared portrait-layer rendering, route-snapshot continuity, removal of compact-only DOM/CSS, source-layer dimensions, and the zero-offset animation endpoint.
- Browser walk-through: `/go` decoded and became swipe-ready; click entry reached `/reports`; the continuity buffer and route-entry attribute cleaned up after settling; browser warnings/errors: none.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 35 files, 207 tests passed.
- `pnpm prisma:validate`: passed.
- `pnpm build`: passed.
- `git diff --check`: passed.

final result: passed
