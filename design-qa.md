# Design QA

## Comparison targets

- Approved guide reference: `C:/Users/bu/AppData/Local/Temp/codex-clipboard-223bb4ab-5934-4e9b-9464-e5212e8c160d.jpg`.
- Exact missing mask supplied by the user: `C:/Users/bu/Desktop/H5设计开发/DHA-h5素材全部打包-8.25/h5-封面-/kv部件/h5kv - 输出.png`.
- Homepage reference/problem evidence: `D:/xwechat_files/wxid_6c31uwcjo0zg22_62e1/temp/RWTemp/2026-09/b21806cd3096cc319427696cfa9339a3/c642ce4dd4ee46684fef339250bced15.jpg`.
- Production preview checked at `http://127.0.0.1:3421/go` and `http://127.0.0.1:3421/reports`.
- Comparison artifact (not committed): `public/__qa__/guide-mask-comparison-final.png`, with the approved reference and production layer composite normalized to the same 750×1625 canvas.

## Guide mask repair

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

- Portrait guide content remains one centered 6:13 scene (`750×1625`) rather than independently moving or stretching its source layers.
- Narrow texture gutters on wider/shorter viewports are intentional and preserve the approved full artwork without cropping or distortion.
- The guide became interactive only after required image decoding; clicking the entry control reached `/reports` without a white frame or failed asset.
- The homepage remained normally scrollable after the entry animation, and the restored batch copy stayed registered to the book coordinate system.

## Verification

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 35 files, 207 tests passed.
- `pnpm prisma:validate`: passed.
- `pnpm build`: passed.
- Targeted guide/archive unit regression: 3 files, 89 tests passed.
- In-app browser visual and interaction walk-through: passed.
- Browser warning/error log: empty.
- `git diff --check`: passed.

final result: passed
