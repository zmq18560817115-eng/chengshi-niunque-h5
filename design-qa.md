# Design QA

## Comparison target

- Source visual truth: user-supplied `codex-clipboard-f888d6d1-ceba-47ce-957e-d162d0a1ca53.jpg` attachment (local reference, not committed).
- Source dimensions: 2000×4333 pixels.
- Implementation route: `/go` in the optimized local production build.
- Primary implementation capture: `artifacts/design-qa/guide-responsive-v2/375x812-initial.png`.
- Implementation dimensions: 1125×2436 pixels from a 375×812 CSS viewport at device scale factor 3.
- Density normalization: the source was resized to the same 1125×2436 comparison canvas before judging; browser chrome and device framing were excluded.
- State: decoded initial guide, motion paused for capture. Additional evidence covers cold cache, failed image decoding, and 0/25/50/75/100 handoff progress.

## Evidence

- Full-view same-canvas comparison: `artifacts/design-qa/guide-reference-vs-375x812.png`.
- Focused logo/character comparison: `artifacts/design-qa/guide-reference-vs-375x812-top.png`.
- Focused report/envelope comparison: `artifacts/design-qa/guide-reference-vs-375x812-envelope.png`.
- Short portrait captures: `artifacts/design-qa/guide-responsive-v2/320x568-initial.png` and `440x820-initial.png`.
- Landscape captures: `artifacts/design-qa/guide-responsive-v2/667x375-initial.png`, `844x390-initial.png`, and `956x440-initial.png`.
- Handoff frames: `artifacts/design-qa/guide-responsive-v2/375x812-progress-000.png`, `375x812-progress-025.png`, `375x812-progress-050.png`, `375x812-progress-075.png`, and `375x812-progress-100.png`.
- Cold-cache fallback: `artifacts/design-qa/guide-responsive-v2/375x812-cold-cache-fallback.png`.
- Compact route handoff: `artifacts/design-qa/guide-responsive-v2/320x568-handoff.png` and `440x820-handoff.png`.

## Findings

- No actionable P0/P1/P2 visual mismatch remains in the requested scope.
- Fonts and typography: the brand logo, Chinese brand name, report lettering, arrow, and instruction remain source raster artwork; no substitute font, HTML recreation, reflow, or missing copy was introduced.
- Spacing and layout rhythm: 375×812 preserves the source 6:13 coordinate system. Short portraits use the same semantic assets with explicit compact placement so logo, character, envelope, heart, arrow, and instruction remain visible without side seams, bottom gaps, or horizontal overflow. Landscape uses a dedicated composition rather than narrowing or stretching the portrait canvas.
- Colors and tokens: the original yellow paper palette and dark-brown instruction treatment are retained. The runtime texture appears slightly stronger than the compressed JPEG reference in some regions; this is a P3 tonal variance and does not change hierarchy, legibility, or brand color family.
- Image quality and asset fidelity: all visible artwork comes from the supplied repository assets or semantic crops of those assets. Natural image ratios are preserved; no whole-page `contain`, non-proportional full-canvas stretch, CSS drawing, placeholder, or invented illustration is used. The decoded fallback remains visible until every required live layer is ready, and remains on any resource failure.
- Copy and content: visible copy matches the approved source. No navigation button or unrelated page copy was added.
- Interaction: gesture progress directly controls overlapping guide/archive `translate` and `opacity`. Every 0/25/50/75/100 frame retains visible subject matter; cold cache and decode failure do not expose a white or texture-only frame.
- Hierarchy: `/go` is replaced by `/reports`; archive→category→report entries carry verified canonical-parent metadata. System Back and right-swipe resolve to the same parent hierarchy, while a direct deep link replaces itself with its canonical parent instead of trusting unrelated visit history. No visible back button was added.

## Comparison history

1. Earlier implementation: one long portrait canvas was scaled to every viewport. This visibly widened the artwork on short screens, collapsed landscape into a narrow strip, and allowed an undecoded transition layer to expose texture/white frames.
   - Fix: split rendering into standard portrait, compact portrait, and landscape semantic compositions; preserve the 6:13 coordinate system only where it fits; predecode the exact route buffer; keep a complete fallback until all required layers decode.
   - Post-fix evidence: the seven initial viewport captures, cold-cache capture, and five handoff progress frames listed above.
2. First compact handoff QA: the hidden preloaded route snapshot could be sampled while its 520 ms release animation was already moving, making a stale test frame look partially clipped.
   - Fix: verification now checks the decoded 0% primed geometry first, then atomically seeks the real CSS transition to 0/25/50/75/100 and measures overlap, opacity continuity, landmark visibility, and decoded destination state.
   - Post-fix evidence: `320x568-handoff.png`, `440x820-handoff.png`, and the compact handoff progress screenshots under `artifacts/`.
3. Hierarchy return QA: repeated production runs exposed a race where category unmount cleanup could overwrite a just-saved scroll position with zero.
   - Fix: report navigation is marked before route change, so readiness remounts may persist scroll on the same category but route-exit cleanup cannot overwrite the saved reading position.
   - Post-fix evidence: repeated hierarchy E2E covers both platform Back and right-swipe return.

## Open questions

- No separate authored compact-portrait or landscape mock was supplied. Those breakpoints preserve and rearrange the existing semantic artwork rather than inventing new material; final brand-art-direction approval can be treated as a P3 follow-up.

## Verification

- Target sizes: 320×568, 375×812, 393×852, 440×820, 667×375, 844×390, and 956×440.
- Additional mobile matrix: 14 portrait/landscape device sizes, including 408×740→408×805 browser-toolbar resizing.
- Handoff checkpoints: 0%, 25%, 50%, 75%, and 100%.
- Failure states: cold cache, delayed decode, individual guide-layer failure, destination preview failure, and static design-resource 4xx/5xx monitoring.
- Primary interactions: upward drag, click entry, archive→category→report, platform Back, right-swipe, deep-link fallback, and category reading-position restoration.
- Browser runtime errors and failed design responses were asserted in Playwright.
- Production browser matrix: 46/46 passed. The category reading-position case additionally passed 10/10 serial repetitions covering both platform Back and report right-swipe Back.
- Required code gates passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (27 files, 170 tests), `pnpm prisma:validate`, and `pnpm build`.
- No push or deployment was performed.

final result: passed
