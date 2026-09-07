# 首页两张纸片滚动滑出

使用红框对应的独立原图：`module-2-inspection-paper`（资源 28）和 `module-2-production-paper`（资源 27）。原图、母版坐标、尺寸及其与文件夹的遮挡顺序保持一致。

两张纸片初始透明并向下偏移自身高度的 50%，位于对应文件夹后方。首页原图解码就绪后，用户向下滚动并到达各自区域时，分别渐显向上滑出。时长复用首页第二部分的 672ms，透明度使用 ease-out，位移使用相同缓动。完成后固定在原稿位置，随页面正常滚动，不循环播放。当前会话已触发的纸片在分类页返回时直接保持最终状态。

人物及其旁边的纸片、文件夹、标题、点击范围和原有循环浮动不参与本次滑出。预览、减少动态效果和不支持 IntersectionObserver 的浏览器显示静态原图。

验证通过：

- `pnpm lint`、`pnpm typecheck`、`pnpm test`（42 文件、282 测试）、`pnpm prisma:validate`、`pnpm build`。
- `pnpm exec node scripts/verify-folder-paper-motion.mjs`：Chromium/WebKit 各 375×812、430×932、375×667、844×390，加减少动态效果，共 10 个场景。检查两张纸片独立触发、途中透明度/位移、672ms 时长、最终坐标尺寸、文件夹遮挡顺序、分类跳转与返回保持最终状态。
- 截图与测量数据：忽略目录 `artifacts/folder-paper-qa/`。
