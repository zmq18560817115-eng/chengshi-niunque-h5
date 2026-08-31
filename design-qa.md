# Design QA

## Scope and source truth

- Scope: fixed H5 hierarchy navigation, image-only fourth-level reports, portrait guide seams, responsive guide composition, and report-image zoom/edge scrolling.
- User reference: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-c1b4ca94-815e-415f-9094-21d72fa399d7.jpg`.
- Approved guide composite: `public/design/guide/guide-final-fallback-v3.webp` (750×1625, 6:13).
- Implementation source remains the approved layers in `public/design/guide/`; no generated substitute artwork, nonuniform stretch, or whole-canvas `contain` was introduced.

## Same-viewport comparison evidence

- Normalized source at 375×812: `artifacts/design-qa/reference-guide-375x812.png`.
- Production implementation at 375×812: `artifacts/design-qa/implementation-guide-375x812.png`.
- Source and implementation in one comparison input: `artifacts/design-qa/guide-source-vs-implementation-375x812.png`.
- Gesture checkpoints at 0%, 25%, 50%, 75%, and 100%: `artifacts/design-qa/guide-transition-checkpoints-375x812.png`.
- Responsive production contact sheet for 320×568, 393×852, 440×820, 667×375, 844×390, and 956×440: `artifacts/design-qa/guide-responsive-production-contact-sheet.png`.
- Short-portrait seam evidence: `artifacts/portrait-edge-final-320x568.png`, `artifacts/portrait-edge-final-440x820.png`, `artifacts/portrait-route-snapshot-final-320x568.png`, and `artifacts/portrait-route-snapshot-final-440x820.png`.
- Fourth-level production report: `docs/audit-2026-08-18-mobile-user/flow-published-report-375x812.png`.

## Findings and resolutions

- P1 fixed hierarchy — resolved: guide → archive → category → report and right-swipe parent navigation all use `router.replace`. Browser-history length stays constant, and right-swiping away from a report cannot reopen it with browser Back. No visible parent/back button was added.
- P1 first category tap race — resolved: the archive used to enable hotspots while `data-guide-route-entry="revealing"` was still awaiting cleanup, so a real first tap could be silently discarded. A tap during the completed reveal now clears that continuity marker and proceeds; the earlier active transition remains protected.
- P1 fourth-level content — resolved: public report pages render only `ImageReportViewer`. PDF and external-link records receive an internal image placeholder with no public href; the former public PDF endpoint returns 410 and performs no storage lookup.
- P1 portrait seams — resolved: the 6:13 main scene keeps its source coordinate system. Only the existing yellow background extends into short-portrait side gutters; arch, window, character, envelope, and foreground are never mirrored. Central edge layers feather into that background, including the route snapshot, so no hard vertical seam or duplicated U-shaped arch remains.
- P1 report zoom anchor — resolved: the first 100%→125% zoom anchors to the currently visible content intersection instead of the full image center. Double-click and pinch use their actual focal point; restoring to 100% preserves the current reading anchor.
- P1 edge scrolling — resolved: 100% uses normal page scrolling. In zoom mode, one-finger movement pans the image and passes unconsumed vertical delta to the page at the top/bottom edge. The former 150 ms width animation was removed because it changed `scrollHeight` after reaching the edge and intermittently trapped the next gesture.
- P1 swipe conflict — resolved: a zoomed report stage carries `data-swipe-back-ignore`, so horizontal image panning cannot trigger page-level right-swipe navigation. No passive-listener `preventDefault` path remains.
- Visual comparison — passed: the 375×812 source and production layout use the same composition and proportions; 320/393/440 portrait captures keep all primary artwork and show no hard side seam; 667/844/956 landscape captures use the dedicated landscape composition and keep logo, character, envelope/report, and hint visible.
- Transition comparison — passed: every 0/25/50/75/100 checkpoint contains a visible guide or archive subject, with overlapping spatial panels controlled by gesture progress; there is no texture-only gap or white frame.
- Remaining P0–P2 findings in this scope: none.

## Verification

- Required gates: `pnpm lint`, `pnpm typecheck`, `pnpm test` (26 files, 156 tests), `pnpm prisma:validate`, and `pnpm build` all passed after the final changes.
- Production browser suite: 24/24 passed, covering 14 responsive guide-to-archive devices, five handoff checkpoints, route/fallback continuity, image-only report content, hierarchy history, zoom anchor, edge scrolling, swipe isolation, and runtime/static-asset errors.
- Formerly intermittent cases were repeated independently: fixed hierarchy 5/5 and native report edge touch 5/5 passed before the complete suite.
- Public fourth-level runtime check: image viewers are present; PDF/external report links and `.report-file-card` are absent; the legacy PDF route returns 410.
- Verification was completed locally before repository handoff; deployment was not performed as part of QA.

final result: passed
