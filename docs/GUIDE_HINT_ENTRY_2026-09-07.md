# 引导文字从底部进入

- 三角箭头与“上滑查看完整营养信息”沿用原素材和最终位置，作为一个整体运动。
- 引导动画启动前，提示透明并位于视口底部外侧；随引导动画同时启动，用 900ms 渐显并向上移动，结束后保持静止，不再循环浮动。
- 位移为提示自身高度加 8cqh；横竖屏分别沿用原有定位与安全区规则，画面边界裁切入场路径，不增加页面滚动高度。
- 进入首页仍以目标页面素材就绪为条件，可在入场动画中途上滑。减少动态效果或素材失败时沿用静态回退。

实现位于 `src/app/globals.css`，时长和位移使用 `--guide-entry-hint-enter-duration`、`--guide-entry-hint-travel`。未修改素材或其他部件的动画节奏。

## 验证

- `pnpm lint`、`pnpm typecheck`、`pnpm test`（42 个测试文件、282 项测试）、`pnpm prisma:validate`、`pnpm build` 全部通过。
- `pnpm exec node scripts/verify-guide-hint-entry.mjs`：Chromium / WebKit 各检查 375×812、430×932、375×667、844×390，以及减少动态效果，共 10 个场景通过；验证初始位置、逐帧渐显与上移、最终位置、单次播放与点击进入。
- `H5_QA_CASE=375x812` 下运行 `scripts/verify-guide-quick-entry.mjs`：两种引擎的动画中途进入、装饰素材仍在加载时进入、减少动态效果，共 6 个场景通过。
- 截图和测量数据保存在忽略目录 `artifacts/guide-hint-entry-qa/` 与 `artifacts/guide-quick-entry-qa/`。
