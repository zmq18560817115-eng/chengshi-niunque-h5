# Design Mapping

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
