# Design QA

## Scope and source truth

- Scope: guide-page visual correspondence, short portrait/landscape adaptation, cold-cache stability, and gesture-driven guide-to-archive continuity. Existing archive/report hierarchy and image-viewer behavior were regression-tested without unrelated visual redesign.
- Approved visual reference: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-f888d6d1-ceba-47ce-957e-d162d0a1ca53.jpg` (2000×4333).
- Read-only semantic sources: `docs/input/design/home-page-v2/homepage-guide-assets/`.
- Runtime fallback: `public/design/guide/guide-final-fallback-v3.webp` (750×1625), rebuilt directly from the approved visual reference.
- No new visual concept, substitute illustration, CSS drawing, Bootstrap/Foundation layer, or external CDN asset was introduced.

## Responsive strategy

- A single fixed aspect-ratio image cannot preserve the approved composition on both 320×568 short portrait and 956×440 landscape without either cropping primary content or creating gutters. The fixed composite is therefore used as a complete decoded fallback, not as the only responsive renderer.
- Portrait uses one 750×1625 normalized content coordinate system for every semantic layer. The scene fills the available content frame in both axes, so logo, character, envelope/report, heart, arrow, and instruction preserve their source landmarks without side seams, detached masks, or missing lower content.
- Existing semantic material hierarchy is preserved. Only source registration was corrected: the body/hat/DHA group was moved by 14 source pixels while the already aligned face, arms, envelope, logo, and foreground remain in their original coordinate groups.
- Landscape uses a dedicated crop/composition of the same transparent semantic layers. It does not shrink the portrait artwork into a central strip and does not introduce an opaque portrait rectangle.
- The approved complete fallback remains visible until all required semantic layers finish decoding. A failed layer keeps the fallback visible; partially decoded layers never replace it.
- The guide and archive panels overlap spatially throughout handoff. Gesture progress directly controls their `translate` and `opacity`; no whole-screen blur or texture-only intermediate frame is used.

## Same-viewport comparison evidence

- Approved reference and production implementation combined at 320×568: `artifacts/design-qa/production/compare-reference-actual-320x568.jpg`.
- Approved reference and production implementation combined at 375×812: `artifacts/design-qa/production/compare-reference-actual-375x812.jpg`.
- Approved reference and production implementation combined at 408×740: `artifacts/design-qa/production/compare-reference-actual-408x740.jpg`.
- Approved reference and production implementation combined at 440×820: `artifacts/design-qa/production/compare-reference-actual-440x820.jpg`.
- Production portrait captures: `artifacts/design-qa/production/guide-320x568.png`, `guide-375x812.png`, `guide-393x797.png`, `guide-393x852.png`, `guide-408x740.png`, `guide-408x805.png`, and `guide-440x820.png`.
- Production landscape captures: `artifacts/design-qa/production/guide-667x375.png`, `guide-844x390.png`, and `guide-956x440.png`.
- Gesture checkpoints: `artifacts/design-qa/guide-progress-000-375x812.png`, `guide-progress-025-375x812.png`, `guide-progress-050-375x812.png`, `guide-progress-075-375x812.png`, and `guide-progress-100-375x812.png`.
- Cold-cache fallback: `artifacts/design-qa/guide-cold-cache-fallback-375x812.png`.

## Findings and resolutions

- P1 visual correspondence — resolved: portrait semantic layers and the approved fallback now use the same full-frame coordinate mapping. Primary landmarks stay aligned at every verified portrait size, with no independently stretched child mask, mirrored edge clone, pale side band, bottom gap, or horizontal overflow.
- P1 short portrait — resolved: 320×568 and 440×820 retain the full logo, character, envelope/report, heart, arrow, and instruction. The instruction no longer overlaps the report, and the lower composition is not clipped.
- P1 landscape — resolved: 667×375, 844×390, and 956×440 use a dedicated semantic arrangement that keeps the core story visible. The portrait is not reduced to a central narrow strip, and no hard rectangular background edge remains.
- P1 loading/white-frame risk — resolved: the complete approved fallback remains present until every required live layer has decoded. Cold-cache delay and decode-failure tests both retain a complete branded scene.
- P1 blinking artifact — resolved: the closed-eye animation returns to the open-eye state at the end of each cycle instead of leaving the closed layer visible.
- P1 transition continuity — resolved: all 0/25/50/75/100 gesture checkpoints contain visible guide or archive subject matter. The panels overlap during the full interaction, so there is no texture-only gap or white frame.
- P1 hierarchy/report regressions — passed: right-swipe navigation continues to use the fixed product hierarchy without growing browser history; image-report zoom/pan remains isolated from page swipe-back and normal 100% page scrolling.
- Framework decision — retained the existing CSS tokens and media-query system. Adding Bootstrap/Foundation would duplicate the project layout system and would not solve semantic image registration or crossfade continuity.
- Remaining P0–P2 findings in this scope: none.

## Verification

- Required gates passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (26 files, 156 tests), `pnpm prisma:validate`, and `pnpm build`.
- Production browser suite passed 28/28 cases, including 14 phone/landscape sizes, 0/25/50/75/100 transition checkpoints, category/report flow, route continuity, 320/440 short portraits, 408×740/805 device viewports, four pixel visual baselines, cold-cache fallback, decode failure, scroll restoration, and static-resource 4xx/5xx checks.
- Portrait pixel baselines passed at 320×568, 375×812, 408×740, and 440×820. Measured mean absolute image differences were 6.80–8.19 with p95 30.67–39, below the suite thresholds of mean 12 and p95 55.
- Verification was completed against the optimized local production build. No commit, push, or deployment was performed.

final result: passed
