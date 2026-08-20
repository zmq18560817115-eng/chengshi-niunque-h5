# Design Mapping

## Homepage guide v1

首屏使用统一素材加载门禁：所有动画关键 WebP 完成 `load` 与 `Image.decode()` 后，再等待连续两帧绘制并添加 `is-ready`。SSR、水合与动画加载期间始终显示同一张 750 x 1625 `guide-first-frame.webp`，动画层就绪后才从相同首帧开始播放，避免最终帧先闪现再跳回首帧。减少动画使用 `guide-final-fallback.webp`，任一动画素材失败时也切换到该最终回退图；回退图自身失败时退化为黄色底色和“向左滑动进入”提示。

引导页的 Logo、标题、说明和滑动提示均属于运行贴图，不从站点配置读取，也不在管理后台提供文字编辑字段；后台页面文案仅管理 `/reports` 档案首页与品牌初心区。

`BrandGuide` uses the v2 layered assets from `docs/input/design/home-page-v2/`, with optimized 750 x 1625 runtime copies in `public/design/guide/`. Every runtime image is a complete canvas with the same origin and uses `object-fit: contain` plus centered positioning inside one 750 x 1625 stage. The stage itself is sized to cover the safe-area-adjusted viewport (`width: max(100%, 46.153846dvh)`, with `vh` and container-query equivalents), so the contain-mapped, same-ratio canvases fill that covering stage without acquiring separate transforms. Its stack is yellow texture (10), arch (15), open/closed character (20), supplied window mask (25), report papers (30), top foreground (35), and swipe guidance (40). The runtime timing source remains `src/components/h5/motion/motion-config.ts`; responsive layout changes do not alter those values. Reduced-motion mode and asset-load failure continue to use the static fallback.

The character canvases contain body `(0, 438, 734, 981)` and the state-specific face `(251, 628, 245, 219/221)`. The z35 top foreground repeats the supplied hat pixels at the identical source coordinates and contains envelope/report sign source canvas `(-1, -2, 860, 1625)`, right arm `(628, 381, 110, 481)`, left arm `(53, 838, 193, 215)`, hand `(229, 947, 96, 117)`, and logo `(136, 116, 489, 152)`. It also promotes the official yellow DHA source pixels at `(449, 475)-(671, 679)` so the right report paper passes behind the lettering exactly as shown in the reference, without moving either layer. This split lets the z25 mask clip the character, the z30 papers remain visible above the mask, and the hat, arms, hand, DHA lettering, sign and Logo still occlude the papers. Open and closed character alpha is identical; their RGB difference is confined to `(251, 628)-(496, 849)`. The four report papers remain separate animated full-canvas assets and are absent from the initial frame; their final component origins are top `(328, -49)`, left `(-107, 169)`, right `(506, 377)`, and bottom `(-165, 1377)`.

The window mask source is a 3127 x 5558 RGBA PNG. It is uniformly scaled by `0.3791907514`, positioned at runtime `(-206, -262)`, and clipped only by the shared 750 x 1625 canvas. The sampled source crop is approximately `(543.26, 690.95)-(2521.16, 4976.39)`. Its transparent window boundary is `(48, 345)-(704, 1081)`, aligned to the arch canvas whose original component is placed at `(-47, 345)`. The lossless WebP preserves full and partial alpha.

All public H5 roots use `--h5-content-width: 750px`, `width: 100%`, and centered max-width containment. The guide uses the entire safe-area-adjusted viewport as one shared stage: the stage cover-fits the viewport, while every 750 x 1625 full-canvas image is contain-fitted inside that same-ratio stage box. The texture, peripheral papers, mask, character, envelope, Logo and hint therefore retain identical normalized coordinates and cannot separate into an inner narrow column plus an unrelated outer background. `100vh`, `100svh`, and `100dvh` are applied progressively, and the stage has no document overflow. `/reports` and its descendants retain their internal layouts inside the same 750px outer width.

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

## Archive artwork and motion

`ReportsArchive` no longer renders `archive-reference.webp`. `ArchiveArtwork` assembles the approved artwork on one 1000 x 5557 master canvas and marks the composition with `data-artwork-source="layered-originals"`. The shared paper texture, module-one parts, and module-two folders/decorations use byte-identical runtime copies under `public/design/final-v1/长图输出/`; their read-only sources remain under `docs/input/design/final-v1/archive-档案首页/`. This keeps the production Docker build independent of the intentionally excluded `docs/input` tree without changing source pixels. Module three uses the untouched complete repository output `public/design/final-v1/长图输出/完整长图-共三个模块_04.jpg` as one 2000 x 2365 source part, displayed at 0.5 scale from master `(0, 4374.5)` without cropping or pixel modification. Navigation hotspots and runtime motion stay above the static composition.

Module-two resources 11–19 are the retired static folder titles and are intentionally neither imported nor rendered. Their replacements are the supplied `检测项目_逐字跳动.gif`, `复核保障_逐字跳动.gif`, and `生产溯源_逐字跳动.gif` files. `ArchiveSectionTitleMotion` positions those GIFs in the same 1000 x 5557 coordinate system, begins preloading when each title is within a 45% viewport margin, and mounts the unoptimized GIF only after its motion stage is ready and the title region is visible. This preserves the GIF animation while avoiding the old title underneath it.

## Category cards and report content

The three category pages use fixed clean artwork backplates (`category-*-clean.webp`) whose card interiors contain no baked business title, description, or action text. `CategoryDetail` overlays `PublicReportCard.title`, `description`, and `buttonText` as normal HTML in the existing card coordinate slots. Those values continue through the existing admin → Prisma → public-content service chain; card artwork, layout, color, type scale, and motion remain fixed in the frontend. The tertiary report page likewise renders the selected card title/description and each asset title/description as HTML, while report images or PDF previews remain replaceable assets. No schema or public URL change is involved.

The brand-story copy uses four fixed transparent line canvases. After trusted manual scrolling reaches the region at the 0.3 intersection threshold, the group waits 150ms. Each line reveals from left to right for 2850ms; with a 1850ms base step and offsets `[0, -350, 0, -950]`, the four line starts occur at 0ms, 1500ms, 3700ms, and 4600ms after that delay. The final line therefore completes after 7600ms of cumulative visible playback. Time is deducted only while the assets are ready, the reveal has started, and the region remains visible; leaving the viewport pauses the completion timer and returning resumes the remaining duration. The artwork does not move or resize during the reveal.
