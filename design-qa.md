# Design QA

## Scope and source truth

- Scope: the `/go` guide canvas, guide-to-home vertical handoff, slow-asset continuity, tap/swipe coexistence, reduced motion, and responsive behavior from 320 px mobile through short landscape.
- User evidence: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-c1b4ca94-815e-415f-9094-21d72fa399d7.jpg`.
- Approved artwork: `public/design/guide/` plus the existing `public/design/final-v1/archive-reference.webp` destination preview. No substitute artwork, CSS illustration, or new visual language was introduced.

## Comparison evidence

- User reference and final 375×812 implementation in one comparison input: `artifacts/design-qa/comparison-user-reference-vs-implementation.png`.
- In-app Browser reference crop and final 480×820 implementation in one comparison input: `artifacts/design-qa/comparison-guide-480x820.png`.
- Gesture-following intermediate frame: `artifacts/design-qa/guide-drag-progress-375x812.png`.
- Gesture commit/route buffer frame: `artifacts/design-qa/guide-drag-commit-375x812.png`.
- Route reveal and settled archive: `artifacts/design-qa/guide-to-archive-revealing-375x812.png` and `artifacts/design-qa/archive-after-guide-375x812.png`.
- Responsive captures: `docs/audit-2026-08-18-mobile-user/` for 320×568, 360×800, 375×667, 375×812, 390×844, 393×797, 393×852, 414×896, 430×932, 440×820, 440×956, and 667×375.

The mobile automation context uses a 3× device scale (for example, the 375×812 CSS viewport capture is 1125×2436 pixels). The in-app Browser QA viewport is 480×820 CSS pixels; its raw capture is normalized from the browser's 2× capture surface before comparison.

## Findings and resolutions

- P1 layout/responsiveness — resolved: the guide and loading stages were capped at the 375 px reference width, producing side gaps and mismatched crops. Both stages now fill the visible viewport. Standard portrait screens use one aligned `cover` canvas; short portrait screens preserve the approved top composition; short landscape screens retain the complete foreground over the supplied yellow texture instead of exposing a blank strip. Safe-height changes use the existing visual-viewport token.
- P1 interaction/behavior — resolved: the old 24 px threshold navigated immediately during `touchmove`. Drag distance now updates one compositor transform and two opacity variables on animation frames; the guide moves upward and fades while the approved home preview rises and fades in. Commit happens on release using progress/velocity, and an incomplete gesture settles back.
- P1 image quality/continuity — resolved: the guide appears as soon as its own artwork is ready, while the approved destination image decodes immediately afterward; gesture/tap entry unlocks only after either that image is safe to composite or the verified paper-texture fallback is active. The gesture panel and route buffer use the same 216 px source crop as the real archive canvas. Matching yellow/paper fallbacks cover the entire viewport, and the real homepage is revealed only after the remaining gesture travel finishes. Slow noncritical homepage layers do not expose the runtime loading poster or a white frame.
- P1 route geometry — resolved: the release handoff previously applied the live drag offset once through `getBoundingClientRect()` and a second time on the continuity track. The snapshot now removes the inherited transform before applying the route offset; automation asserts the pre-release and post-release visual top remain within 2 px.
- P2 mobile controls — resolved: explicit pointer capture on the transparent bottom entry control could swallow a touch-generated click. A tap now enters normally, while a swipe beginning in the same bottom area still follows the finger and commits.
- P2 gesture isolation — resolved: horizontal release no longer flushes an upward progress value, touch tracking is identifier-strict, and an unrelated second finger cannot finish or commit the primary gesture.
- P2 performance — resolved: no React state is written per move; position and alpha are batched in `requestAnimationFrame`, limited to `transform`/`opacity`, and `will-change` is active only while dragging/settling. Browser/CDN cache headers already cover `/design/*`, so no second CSS framework or duplicate asset pipeline was added.
- Accessibility — passed: the semantic entry button and accessible copy remain, keyboard focus remains visible, and `prefers-reduced-motion` disables the new movement/opacity transitions.
- Remaining P0–P2 findings: none.

## Verification

- Fresh in-app Browser session: guide bounds equal viewport bounds, the approved destination reports 1000×5557 and decoded/ready, all visible guide layers have nonzero natural width, horizontal overflow is zero, gesture state reaches `ready`, and the console contains no application warnings or errors.
- Mobile automation: all 12 responsive viewport cases completed guide-to-archive without horizontal overflow; the 375×812 drag test verified progress greater than 0.2, upward offset beyond 160 px, guide opacity below 0.85, destination opacity above 0.5, route-buffer continuity, and no runtime error.
- Slow-asset handoff tests passed for the retained guide/destination buffer, staged archive reveal, loader suppression, and restored archive scrolling.
- Unit/integration suite: 24 files, 146 tests passed.
- Required gates passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm prisma:validate`, and `pnpm build`.

final result: passed
