# Design QA

## Comparison targets

- Approved guide reference: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-223bb4ab-5934-4e9b-9464-e5212e8c160d.jpg`.
- Exact missing mask supplied by the user: `C:/Users/bu/Desktop/H5设计开发/DHA-h5素材全部打包-8.25/h5-封面-/kv部件/h5kv - 输出.png`.
- Homepage reference/problem evidence: `D:/xwechat_files/wxid_6c31uwcjo0zg22_62e1/temp/RWTemp/2026-09/b21806cd3096cc319427696cfa9339a3/c642ce4dd4ee46684fef339250bced15.jpg`.
- Guide-to-home first-module reference: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-2d18e007-26a4-4a53-bf3f-831c61a4a793.png`.
- Latest-public-batch second-module reference: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-22a34db5-631d-421a-8ad2-339f378388c6.png`.
- Production preview checked at `http://127.0.0.1:3422/go` and `http://127.0.0.1:3422/reports`.
- Comparison artifact (not committed): `public/__qa__/guide-mask-comparison-final.png`, with the approved reference and production layer composite normalized to the same 750×1625 canvas.

## Guide mask repair

- The two read-only guide source directories contain 22 same-named files with matching SHA-256 hashes (22/22, zero mismatches). Runtime layers therefore resolve to the repository source artwork rather than screenshot crops or substitute drawings.
- `public/design/guide/guide-final-fallback.webp` is the closest existing 750×1625 approved-reference normalization (MAE 1.342, RMS 2.752 against the supplied 2000×4333 reference) and was used as the side-by-side visual target.
- The supplied 3127×5558 RGBA source and the repository's read-only design input have the same SHA-256 hash. That exact asset was registered to the 750×1625 master canvas; no screenshot crop, redrawing, or substitute art was used.
- The arch-shaped opening in the source is transparent. Visual comparison caught that it must not be flattened over white: the yellow mask is now placed above the character and below the painted arch frame.
- Verified runtime order: character `z-index:20`, supplied window mask `z-index:25`, painted arch `z-index:27`, loose papers `z-index:34`, foreground `z-index:35`.
- All full-canvas guide layers decode at 750×1625 and share exactly the same rendered bounds. Browser measurement found zero horizontal document overflow.
- Static fallback and route-transition snapshot use the same complete background/character/mask/arch/paper/foreground composition. The new `guide-static-foreground-v2.webp` URL avoids serving the previous cached fallback during the handoff.
- Side-by-side review confirmed the yellow dome texture, character clipping, logo, loose papers, envelope, heart, and instruction remain aligned with the approved reference.

## Homepage asset repair

- Restored the supplied `module-1-passed-copy` source layer above the existing latest-batch panel instead of baking in a screenshot.
- Verified source alpha crop `(469,1821)-(1097,1934)`, runtime size 628×113, and final master-canvas placement `(63,1821)` after the existing module offset.
- The copy is part of the `latest-batch` entry group and enters with that whole second section, preserving the requested staged transition.
- The decoded fallback and live layered homepage now both show all four public-batch conclusions. Browser inspection confirmed the new layer is decoded, visible, at stage 3 and `z-index:40`.
- The homepage settled after guide navigation with its continuity buffer removed, zero horizontal overflow, and no browser warnings or errors.

## Responsive and interaction checks

- Portrait guide content remains one centered 6:13 scene (`750×1625`) rather than independently moving, stretching, or screenshot-cropping its source layers.
- Mobile geometry is width-driven (`750px / 750 × 100 = 100vw`, `1625px / 750 × 100 = 216.666667vw`). Short embedded-browser viewports clip equal top/bottom overflow from that one scene; no yellow side seam or pseudo-surround remains.
- The lower-center guidance is a separate supplied transparent asset anchored to the visible artwork viewport, so the full hint remains visible while the source scene is vertically cropped.
- Loading poster, bootstrap stack, live stack, reduced-motion fallback, and route snapshot all use the same full-width registration, preventing a geometry jump during asset handoff.
- Browser measurements at the mobile QA viewport found artwork width = scene width = viewport width, scene ratio exactly 6:13, centered vertical overflow, and zero horizontal document overflow.
- A single browser comparison view placed `guide-final-fallback.webp` beside the live layered `/go` route at the same 375×760 viewport. Logo, arch, character, loose sheets, arms, envelope, heart, and bottom guidance retained their source registration; the live page showed no horizontal seam.
- The guide became interactive only after required image decoding; clicking the entry control reached `/reports` without a white frame or failed asset.
- The homepage remained normally scrollable after the entry animation, and the restored batch copy stayed registered to the book coordinate system.

## Guide-to-home staged handoff repair

- Removed the flattened `archive-transition-preview.webp` from the transition path. The guide preview, route buffer, and live homepage now use the same approved paper, five book layers, four latest-batch layers, and supplied purple ribbon asset.
- The book is one first-stage group. The latest-public-batch panel is one second-stage group and begins at `0.8 × 520ms = 416ms`; its opacity and vertical offset move only toward the final state after commit.
- The hidden prewarmed buffer has transitions disabled until its exact gesture state is written and layout is committed. Stage timing starts from the actual animation frame, so 30Hz or dropped-frame WebViews cannot release the buffer early.
- The route buffer remains until both the book transition and latest-batch transition finish. Its release is generation-guarded, preventing stale animation frames or timers from restoring a route lock after cleanup.
- The live homepage stays at final geometry underneath the buffer and no longer replays the parent artwork entrance animation. This removed the observed buffer-to-live opacity dip.
- The supplied ribbon remains at `idle`, progress `0.000`, and bottom clip `87.240356%` in the guide preview, route buffer, normal live page, reduced-motion path, and disabled-motion path. Only trusted downward scrolling advances the live ribbon.
- During guide entry, the baked full-state fallback is suppressed even on the failure path; it cannot flash the completed batch panel or full ribbon over the staged animation.
- Transition and live homepage content widths now use the same safe-area-aware 750px content frame, preventing a width jump in notched landscape WebViews.
- In-app browser verification used the existing 375×812 QA viewport. Frame sampling found zero book-opacity regressions, zero batch-opacity regressions, zero fallback-visible route frames, and zero visible ribbon-state mismatches. During route-buffer release and after live takeover, combined book and batch visibility remained `1.000`; the final route had no buffer and one live ribbon at `idle / 0.000`.

## Verification

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 35 files, 209 tests passed.
- `pnpm prisma:validate`: passed.
- `pnpm build`: passed; emitted `.brand-guide-portrait-scene,.h5-guide-route-snapshot.is-portrait{width:100vw;height:216.666667vw}` and retained the 750px desktop cap.
- Targeted guide/route/motion unit regression: 3 files, 90 tests passed.
- In-app browser visual and interaction walk-through: passed.
- Browser warning/error log: empty.
- `git diff --check`: passed.

final result: passed
