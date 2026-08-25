# Design Mapping

## Homepage guide v1

首屏使用统一素材加载门禁：所有动画关键 WebP 完成 `load` 与 `Image.decode()` 后，再等待连续两帧绘制并添加 `is-ready`。SSR、水合与动画加载期间直接使用与动画零帧相同的分层画布：背景、睁眼人物、窗口蒙版、黄色窗框和信封前景从第一帧即完整存在。资源就绪后以 180ms 只交接到同坐标的动画画布，不再切换旧的 `guide-first-frame.webp`，因此不会在首屏后突然补入窗口蒙版。闭眼表情在 350–620ms 内单独渐变，四张纸从 420ms 开始分别连续进入，最后一张在 2140ms 落定后开放上滑和点击。新的“上滑查看完整营养信息”贴图固定在首屏下方中心，不参与动画；`guide-final-fallback-v3.webp` 只用于减少动画、禁用和失败降级，不参与正常时间轴。回退图自身失败时退化为黄色底色和相同的上滑提示。

引导页的 Logo、标题、说明和滑动提示均属于运行贴图，不从站点配置读取，也不在管理后台提供文字编辑字段；后台页面文案仅管理 `/reports` 档案首页与品牌初心区。

`BrandGuide` uses the v2 layered assets from `docs/input/design/home-page-v2/`, with runtime copies in `public/design/guide/`. Every full-stage runtime image is a complete 750 x 1625 canvas with the same origin and uses `object-fit: cover` inside one shared stage. The normal runtime stack is yellow texture (10), open/closed character (20), supplied window mask (25), yellow arch/frame (27), report papers (34), complete envelope/arm foreground (35), and the independent static lower-center entry guidance (40). The same non-animated artwork stack is used before preload completion. Only each character/paper layer's opacity and transform changes; no full-canvas initial or final reference is mounted in the normal timeline. The runtime timing source remains `src/components/h5/motion/motion-config.ts`. Reduced-motion mode and asset-load failure continue to use the static final fallback. The guide exits upward with a fade, and `/reports` enters from below with the matching upward fade.

The character canvases contain body `(0, 438, 734, 981)` and the state-specific face `(251, 628, 245, 219/221)`. The z35 foreground is the supplied complete envelope/arm/sign canvas and remains above all incoming report papers. This makes the left and right sheets enter beneath the envelope and arms without duplicating or approximating any mask. Open and closed character alpha is identical; their RGB difference is confined to `(251, 628)-(496, 849)`. The four report papers remain separate animated full-canvas assets and are absent from the initial state. Their source-canvas origins are top `(328, -49)`, left `(-107, 169)`, right `(506, 377)`, and bottom `(-165, 1377)`. Same-state pixel registration against the user-supplied completed reference keeps the measured right-paper effective final origin at `(582, 360)` while its z34 layer stays below the z35 foreground throughout the motion.

The window mask source is a 3127 x 5558 RGBA PNG. It is uniformly scaled by `0.3791907514`, positioned at runtime `(-206, -262)`, and clipped only by the shared 750 x 1625 canvas. The sampled source crop is approximately `(543.26, 690.95)-(2521.16, 4976.39)`. Its transparent window boundary is `(48, 345)-(704, 1081)`, aligned to the arch canvas whose original component is placed at `(-47, 345)`. The lossless WebP preserves full and partial alpha.

All public H5 roots use `--h5-content-width: 750px`. The guide root fills exactly one current viewport and never scrolls internally. Its 750 / 1625 stage takes the smaller of the available width and height, remains centered, and is never stretched or cropped. A 375 x 812 viewport renders approximately 374.77 x 811.98; a shorter 375 x 667 viewport renders approximately 307.84 x 666.98. Any remaining side area uses the repository `guide-background.webp` texture instead of a flat invented colour. The texture, peripheral papers, mask, character, envelope, Logo and hint retain one normalized coordinate system; `/reports` and its descendants retain their internal layouts inside the same 750px outer width.

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

The brand-story copy uses four fixed transparent line canvases. After trusted manual scrolling reaches the region at the 0.3 intersection threshold, the group waits 150ms. Each line reveals from left to right for 900ms; with a 500ms base step and offsets `[0, -100, 0, -200]`, the four line starts occur at 0ms, 400ms, 1000ms, and 1300ms after that delay. The final line therefore completes after 2350ms of cumulative visible playback. Time is deducted only while the assets are ready, the reveal has started, and the region remains visible; leaving the viewport pauses the completion timer and returning resumes the remaining duration. The artwork does not move or resize during the reveal.
