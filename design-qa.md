# Design QA

## Comparison Target

- Source visual truth: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-dbfae28d-1316-463e-a0c1-3057f261f09c.jpg`
- Source component asset: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-a46d7505-b1f4-4f2b-a183-872d17e28cef.png`
- Browser-rendered implementation: `D:/chengshi-niunque-h5/design-qa-evidence/implementation-guide-normalized-750x1624.png`
- Full-view comparison: `D:/chengshi-niunque-h5/design-qa-evidence/comparison-guide-full.png`
- Focused lower-region comparison: `D:/chengshi-niunque-h5/design-qa-evidence/comparison-guide-bottom.png`
- Route-motion evidence: `D:/chengshi-niunque-h5/design-qa-evidence/transition-guide-exit.png` and `D:/chengshi-niunque-h5/design-qa-evidence/transition-archive-entry.png`
- Route/state: `/go`, animation settled at 2,800 ms, motion allowed, entry unlocked; `/reports` after entry.

## Viewport And Normalization

- Source pixels: 2000 × 4333, normalized to 750 × 1624 for comparison.
- Browser capture pixels: 1500 × 3248 from the in-app browser's doubled screenshot surface.
- App CSS canvas: 750 × 1624 under the browser's 375 × 812 mobile viewport override.
- Density normalization: the app-owned upper-left 750 × 1624 canvas was cropped from the doubled browser capture, producing a 1:1 comparison against the normalized source. Browser canvas padding was excluded.
- The final hint measured 394.39 × 47.23 px at x=177.80 px with 43.84 px bottom clearance, matching the source's 52.6% width, horizontal center, aspect ratio, and approximately 2.7% bottom clearance.

## Findings

- No actionable P0, P1, or P2 differences remain in the requested adjustment.
- Fonts and typography: the visible instruction is the supplied raster asset, so its hand-drawn letterforms, weight, spacing, punctuation, and wrapping match the source exactly.
- Spacing and layout rhythm: the instruction is centered and scales from the same measured percentage as the source. Its separate 48 px-or-larger invisible action area does not change the visible layout.
- Colors and visual tokens: the original transparent orange/brown asset is used without recoloring; the underlying yellow texture remains visible with no white box or alpha halo.
- Image quality and asset fidelity: the supplied RGBA component is used directly at its native aspect ratio. No CSS drawing, replacement glyph, SVG approximation, stretching, or generated substitute is present.
- Copy and content: the visible copy is the supplied “上滑查看完整营养信息!” artwork. Screen-reader guidance now says “向上滑动，或点击下方提示进入档案”.
- Accessibility and behavior: the entry remains a semantic button with a practical touch target; deliberate upward touch gestures enter only after the existing paper animation unlocks. Reduced-motion mode keeps a static final reference and a fade-only route change.
- The source full-page reference shows the open-eye state while the settled implementation capture shows the existing blink state. This is intentional because the request explicitly preserves the guide artwork and animation; the comparison judges the newly supplied lower instruction and its placement.
- The black Next.js development badge in the browser capture is dev-only infrastructure and is not part of the production page.

## Comparison History

1. First pass found a P2 scale mismatch at the 750 px design canvas: the instruction was capped at 212 px instead of the source-equivalent 394.5 px.
2. Fixed `--guide-entry-hint-width` to retain the 52.6vw ratio through the full 750 px H5 canvas, with a 24.65rem ceiling, and updated the responsive image sizes metadata.
3. Post-fix full and focused comparisons show the instruction aligned to the source at 394.39 px wide, centered, with matching bottom clearance. No P0/P1/P2 findings remain.

## Interaction And Console Verification

- Targeted interaction tests passed for upward swipe, invalid-direction rejection, animation lock, click-once navigation, preview, failure fallback, and reduced motion.
- In-app browser click navigation reached `/reports`, and the archive page was visible after transition.
- The guide exit was captured with `is-leaving`, opacity fading toward 0, and a negative Y translation. The archive uses the matching `reports-slide-up-fade` entrance and finishes at opacity 1 / zero translation.
- A fresh `/go` → `/reports` browser run produced no console warnings or errors.

## Open Questions

- None.

## Implementation Checklist

- [x] Remove the old lower-right hint layers and their animation.
- [x] Mount the supplied static lower-center upward-swipe hint.
- [x] Change the guide gesture to deliberate upward swipe while retaining click entry.
- [x] Change guide/archive route motion to upward slide plus fade.
- [x] Preserve the guide artwork, blink, paper timing, entry lock, preview, and reduced-motion behavior.

## Follow-up Polish

- No P3 polish is required for this scoped change.

final result: passed
