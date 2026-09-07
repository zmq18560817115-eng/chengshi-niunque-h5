# 首页紫色提示滑入

紫色“下滑查看报告”沿用原图与原定位，在首页素材就绪、引导切换结束且部件进入可视区域后，从右向左滑入一次，800ms 后停在原位置。之后继续随文档滚动；页面宽度、层级与点击区域不变。

- `ArchiveUnlockTabMotion` 观察原有定位容器，仅移动图片。初始位移为自身宽度的 110%，由页面边缘裁切；结束后移除动画，不持续浮动。
- 引导切换的预览和缓冲层暂时隐藏对应紫色图层，由正式首页播放入场，避免静态图先出现又消失。
- 预览、减少动态效果、动画开关关闭或浏览器不支持 IntersectionObserver 时使用完整静态原图。图片失败时沿用首页既有回退。
- 时长位于 `h5MotionTiming.archiveUnlockTab.enterDurationMs`，距离 token 为 `--archive-ribbon-enter-offset`。

验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`（43 个文件 / 286 项测试）、`pnpm prisma:validate`、`pnpm build`。浏览器复核脚本为 `pnpm exec node scripts/verify-ribbon-entry.mjs`，检查直接进入、引导页进入、横竖屏与减少动态效果；截图和逐帧数据存放于忽略目录 `artifacts/ribbon-entry-qa/`。
