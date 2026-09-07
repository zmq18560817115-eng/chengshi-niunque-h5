# 首页三个模块即时按压反馈

- 修复标题按压选择器没有覆盖实际 `.archive-section-character-slot` 图层的问题。
- 按下时对应文件夹立即明显变暗，标题和点击箭头同步下压并缩至 94%；按压样式不再等待 70ms 过渡。参数统一放在 `globals.css` 的 `--archive-press-*` tokens。
- 原有多边形色块点击范围保留，按压色层沿同一范围显示，在整图降级时也可见。文件夹主体维持原位，只有透明标题及箭头部件产生下压。
- 松手立即启动既有加载过渡与路由，不增加停留计时。拖动超过 10 CSS px、指针取消或离开时清除按压，避免滚动触发跳转；键盘按压也有反馈，失焦后复位。
- 标题、箭头、鱼部件原有循环频率保持不变；减少动态效果时保留色彩反馈，关闭下压位移。

验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（41 文件、278 测试）、`pnpm prisma:validate`、`pnpm build` 全部通过。

`pnpm exec node scripts/verify-archive-press.mjs` 完成 Chromium/WebKit × 三模块 × 色块/箭头的 12 个浏览器场景，覆盖 375×812 与 430×932。按下后的下一次读取即可获得有效按压样式（过渡时间 0s）；松手后立即显示加载层。验证取消拖动、后续再次点击以及各自正确分类页。截图与测量结果位于忽略目录 `artifacts/archive-press-qa/`。
