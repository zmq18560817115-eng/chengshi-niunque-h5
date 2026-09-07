# 750px 适配与入场、分类卡片修正

用户确认：反馈的第四层级是三张截图中的分类卡片页；第二个入场模块为“最新公开批次”和下方四条对勾说明的整块区域。

## 750px 与纯静态示例

- `src/app/layout.tsx` 已输出唯一的 `width=device-width, initial-scale=1, viewport-fit=cover` viewport；未禁止缩放。
- 公式为 `设计稿 px / 750 * 100 = vw`。200 × 100px 对应 26.666667vw × 13.333333vw，在 375px 手机上为 100 × 50 CSS px。
- 继续使用既有 PostCSS 插件与 750px 配置，`.vw.css` / `.vw.module.css` 在应用构建时自动转换。保留 1px 细线和媒体查询中的 px。原始 2000px 图层坐标按画布比例定位，不做二次 px 换算；既有后台和 375px 逻辑样式也不参与转换。
- 新增 `public/examples/vw-card/index.html`，纯 HTML/CSS/JS，可直接用浏览器打开，或访问本地服务的 `/examples/vw-card/index.html`。编辑同目录 `card.vw.css` 后，运行 `pnpm example:vw` 输出 `card.css`；与应用使用同一个 PostCSS 配置。静态 `public/` 文件不会自动经过 Next.js CSS 构建。

## 入场

- 引导页向上推出并渐淡，首页书本全部区域为第一组。滑动预览与提交后的缓冲层使用相同资产、同一套透明度进度；没有横向页面切片。
- 书本完成时间从 630ms 延长到 840ms。第一组透明度达到 80% 时（从零开始为 672ms）第二组开始，第二组时长 672ms；再等待 120ms 完成帧与 520ms 缓冲交接。拖动已有进度时按剩余进度续接。
- 第二组包含批次标题、批次信息、人物、整块白色／粉色结果卡、四条对勾与说明。生成资产为 `archive-1-batch-module.webp`；书本为 `archive-1-book-stage.webp`。二者合成在 WebP 压缩前严格逐像素等于原始完成稿。
- 卡片下方临时书本底层仅延展同一原图的黄色肌理、可见下边缘和纸纹；详细来源局限见 `OPEN_QUESTIONS.md` 第 23 项。未使用旧版书本作为最终画面。
- `python scripts/refresh-design-assets.py --archive-entry` 可单独重建此分组。完成后恢复正常文档滚动，沿用动态部件的现有循环频率和减少动画偏好。

## 分类卡片

- 检测项目的资源 104、105 放反。对照素材包完整原稿，恢复“核心营养含量 → 每粒 DHA/ARA 实测含量”（105）和“油脂新鲜度 → PV/AV 与氧化说明”（104）。坐标、默认文字和可访问说明同步。
- 补齐旧 seed 文案识别，去掉卡片内残留的“复核采用的质量标准与记录。”等旧占位说明。后台明确自定义的标题与说明继续保留。
- 分类页和报告页共用 `src/config/h5-card-copy.ts`；默认文案优先按稳定卡片 ID 解析，排序或隐藏其他卡片不会套用邻卡的说明。类别、卡片 ID、已发布资产、报告排序和访问接口没有迁移。
- 生产溯源的“经营资质”按原稿保留无正文状态。

## 验证

- `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm prisma:validate`、`pnpm build` 通过；38 个测试文件、261 项测试通过。
- `pnpm exec node scripts/verify-mobile-adaptation.mjs`：320×568、375×668、390×844、430×932、750×1334，5 个纯静态示例尺寸和 15 个分类页面检查通过。检查唯一 viewport、示例比例、原图标题／说明、各部件不越出卡片、无横向溢出、短屏内部滚动可到底。
- 375px 下全部 8 张卡片点击至各自 ID 的报告页，分类／报告标题与说明一致。本地测试数据未发布实际图片报告，文件内容没有在此次视觉验收中替换或补造。
- 375×812 分阶段入场真实浏览器测试通过，验证 840ms / 672ms / 672ms 时序、第二组完成后交接、无重播以及恢复滚动。
- 唯一 viewport 与连续上滑手势测试通过；手势在 25%、50%、75% 进度下保持上下滑动和连续渐变，松手后接续到完成态。
- 浏览器截图与尺寸数据位于 `artifacts/mobile-adaptation-750/`，分组的原始合成对比位于 `artifacts/asset-refresh/archive-book-before-batch.png`、`archive-batch-group.png`、`archive-entry-complete.png`。

此前 624768b 提交已按当时请求推送。用户后续明确要求将本轮修正提交并推送当前分支 `codex/p1-repair-v2`；本轮验证记录对应上述代码与资产，不包含部署。
