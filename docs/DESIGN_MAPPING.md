# Design Mapping

## Homepage guide v1

首屏使用统一素材加载门禁：所有关键 WebP 同时完成 `load` 与 `Image.decode()` 后，再等待连续两帧绘制并添加 `is-ready`。加载期间显示与动态舞台第 0 帧完全一致的 `guide-first-frame.webp`，不显示报告纸和滑动提示；动态舞台透明且动画暂停。ready 后动态第 0 帧先完整显示，首帧贴图在 100ms 内淡出，淡出结束后的下一帧才添加 `is-animating` 并启动时间线。任一动态素材失败时才显示 `guide-final-fallback.webp`；首帧图或最终回退图自身失败时退化为黄色底色和“上滑进入”提示。

引导页的 Logo、标题、说明和滑动提示均属于运行贴图，不从站点配置读取，也不在管理后台提供文字编辑字段；后台页面文案仅管理 `/reports` 档案首页与品牌初心区。

`BrandGuide` uses the v2 layered assets from `docs/input/design/home-page-v2/`, with optimized 750 x 1625 runtime copies in `public/design/guide/`. The 2000 x 4333 reference maps to the runtime canvas with x scale `0.375` and y scale `0.3750288484`; the difference is sub-pixel rounding. Every runtime layer is a complete 750 x 1625 canvas with the same origin, and the browser scales only the complete stage. Its isolated stack is yellow texture (10), arch (15), open/closed character body and face (20), transparent window mask that clips character overflow (25), four simultaneous report papers above the mask (30), the top foreground containing the hat, Logo, arms, hand, envelope/report sign and blue heart (35), and swipe guidance (40). No CSS or polygon window approximation is used. From `is-animating`, the blink and all four paper transitions start together at 500ms; the closed face remains for 150ms, all papers use a 650ms `cubic-bezier(.22, 1, .36, 1)` transition and reach their final coordinates at 1150ms, the swipe hint fades in from 1250ms to 1450ms, and arrow looping begins at 1500ms. The completed frame remains on screen indefinitely; only click or an upward swipe can enter the reports archive. Reduced-motion mode and asset-load failure show the v2 final static reference image with the same click/swipe-only entry behavior.

The character canvases contain body `(0, 438, 734, 981)` and the state-specific face `(251, 628, 245, 219/221)`. The z35 top foreground repeats the supplied hat pixels at the identical source coordinates and contains envelope/report sign source canvas `(-1, -2, 860, 1625)`, right arm `(628, 381, 110, 481)`, left arm `(53, 838, 193, 215)`, hand `(229, 947, 96, 117)`, and logo `(136, 116, 489, 152)`. It also promotes the official yellow DHA source pixels at `(449, 475)-(671, 679)` so the right report paper passes behind the lettering exactly as shown in the reference, without moving either layer. This split lets the z25 mask clip the character, the z30 papers remain visible above the mask, and the hat, arms, hand, DHA lettering, sign and Logo still occlude the papers. Open and closed character alpha is identical; their RGB difference is confined to `(251, 628)-(496, 849)`. The four report papers remain separate animated full-canvas assets and are absent from the initial frame; their final component origins are top `(328, -49)`, left `(-107, 169)`, right `(506, 377)`, and bottom `(-165, 1377)`.

The window mask source is a 3127 x 5558 RGBA PNG. It is uniformly scaled by `0.3791907514`, positioned at runtime `(-206, -262)`, and clipped only by the shared 750 x 1625 canvas. The sampled source crop is approximately `(543.26, 690.95)-(2521.16, 4976.39)`. Its transparent window boundary is `(48, 345)-(704, 1081)`, aligned to the arch canvas whose original component is placed at `(-47, 345)`. The lossless WebP preserves full and partial alpha.

All public H5 roots use `--h5-content-width: 750px`, `width: 100%`, and centered max-width containment. The guide uses the entire safe-area-adjusted viewport as one shared stage. Every 750 x 1625 full-canvas runtime layer is mapped through that same stage box, so the texture, peripheral papers, mask, character, envelope, Logo and hint retain identical normalized coordinates and cannot separate into an inner narrow column plus an unrelated outer background. `100vh`, `100svh`, and `100dvh` are applied progressively, and the stage has no document overflow. `/reports` and its descendants retain their internal layouts inside the same 750px outer width.

Source inspected: `docs/input/homepage-design-v0.jpg`. Its JPEG signature and 2000 × 10860 pixel dimensions were verified before normalizing the extension. All sampled values are temporary, not approved brand specifications.

| Visual region | Observed content | Component | Confidence / action |
| --- | --- | --- | --- |
| Top browser-like strip | Back, title, search, more | Outside branded content | Whether included is 待设计确认 |
| Yellow document cover | logo, 诚实透明档案, card, batch and pass labels | `HeroIntro` | Structure confirmed; assets/proportions/animation 待设计确认 |
| Cream transition | 为宝贝把关，看清3层证据, mascot | `EvidenceOverview` | Order confirmed; typography/art 待设计确认 |
| Green/yellow/brown folders | 检测项目/复核保障/生产溯源 | `InformationModules` | Three entries confirmed; interactive states 待设计确认 |
| Large brown area | No detailed content visible | `ModuleDetail`, `ReportCard`, `ReportViewer` | Content and height 待设计确认 |
| Cream brand block | logo, 品牌初心, short copy | `BrandStory` | Theme confirmed; final copy 待设计确认 |
| Envelope/mascot closing | statement and illustration | `PageFooter` | Assets and behavior 待设计确认 |

Observed palette is warm cream, yellow, dark chocolate, pale green, warm brown, with pink/blue accents. Headings appear hand-drawn and body copy simpler. Sections are full-width with paper-like overlaps, rounded cards, outlines, and modest depth. Exact fonts/licensing, colors, sizes, line heights, spacing, radii, shadows, crops, breakpoints, and safe areas are 待设计确认.

All current values are CSS custom properties in `src/app/globals.css`. The layout uses 375px as reference, remains usable at 320–430px, and centers on larger screens. `HeroIntro` exposes an animation placeholder only; storyboard, replay policy, reduced motion, duration, and easing are 待设计确认.

## Category cards and report content

The three category pages use fixed clean artwork backplates (`category-*-clean.webp`) whose card interiors contain no baked business title, description, or action text. `CategoryDetail` overlays `PublicReportCard.title`, `description`, and `buttonText` as normal HTML in the existing card coordinate slots. Those values continue through the existing admin → Prisma → public-content service chain; card artwork, layout, color, type scale, and motion remain fixed in the frontend. The tertiary report page likewise renders the selected card title/description and each asset title/description as HTML, while report images or PDF previews remain replaceable assets. No schema or public URL change is involved.

The brand-story copy uses four fixed transparent line canvases. After the region is reached by trusted manual scrolling, the group waits 220ms; each line reveals from left to right for 750ms, followed by a 160ms pause before the next line. The full sequence completes in 3.7 seconds without moving or resizing the artwork.
