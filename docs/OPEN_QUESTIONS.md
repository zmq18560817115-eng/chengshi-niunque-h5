# Open Questions

These are not blockers for the skeleton.

## Design/content

1. Is the top browser-like strip part of the H5 or screenshot chrome?
2. Provide final source/export scale, artboard dimensions, cuts, fonts/licenses, colors, spacing, radii, shadows, safe areas, and responsive rules.
3. Provide final batch/result/module/story/footer/share copy plus empty/loading/error states.
4. Confirm default module state, single-open rule, expanded-detail design, and long-content behavior.
5. Confirm animation storyboard/assets/timing/easing/skip/replay/reduced-motion behavior.

## Reports/files

6. Confirm module/card/report limits, maximum size, formats, image dimensions, and filename rules.
7. Confirm inline/modal/route/download/external report viewing per target browser.
8. Confirm sensitive-data controls: signed URLs, expiry, watermark, download rules, authentication.
9. Define dead-link detection schedule/retry/alerts and retention/deletion rules.

## Admin/publishing

10. Confirm administrator count, password/reset/session policy, and v1 account management.
11. Confirm draft/preview/publish/offline/approval/rollback semantics and preview isolation.
12. Confirm audit retention/export/IP policy and hard versus soft delete.

## Infrastructure/operations

13. Provide Linux/server architecture, domain/备案/TLS/firewall/backups/monitoring/log policy.
14. Confirm production database/storage provider, region, capacity, access, RPO/RTO.
15. Confirm analytics platform/events and WeChat share/JSSDK prerequisites.
16. Reconcile the execution-plan dates with the requirement document's 2026-08-27 launch target.

## Multi-page H5 follow-ups

17. Confirm the final art-direction approval for the derived landscape guide composition. The local P1 repair now recomposes only supplied guide layers into a dedicated 1500×800 asset, with a documented center crop that keeps the logo, mascot, report, envelope, heart, and separate swipe hint inside the supported 667/844/956 landscape safe area. No new illustration was invented; the final design source should eventually replace this derived runtime export.
18. Confirm whether `/go` should remain a temporary 307 redirect to `/`, become permanent, or preserve channel tracking parameters.
19. Confirm whether report images require pinch-to-zoom, drag boundaries, and landscape rules beyond the current 1–3x controls.
20. Provide an approved branded artwork asset for the visible fixed-level return controls. The local P1 repair currently uses a neutral semantic button so users are not forced to discover an unlabelled gesture.
21. Confirm the final guide gesture acceptance distance and travel curve. The supplied 30fps reference proves touch-move feedback begins within one frame, but it does not expose finger coordinates; the current mobile-first acceptance uses 24 CSS px and a 5dvh buffered rise so early swipes are no longer dropped.
22. Provide authored compact-portrait and landscape guide compositions if brand review requires a different crop. The current 320/440 short-screen and 667/844/956 landscape layouts preserve and rearrange only the supplied semantic artwork because no approved breakpoint-specific mock was provided.

## 2026-09-07 supplied component replacement

23. 新包没有独立的长图模块一黄色文件夹底层。用户后续明确第二组是“最新公开批次”和下方四条对勾的整块区域，现用资源 5 的原始卡片／人物透明轮廓，加上批次标题与说明轮廓分离完整第二组。入场前被卡片遮住的黄色肌理、书本下边缘和纸底仅从同一张原图的邻近可见区域延展；这一被遮挡区域的独立设计源仍未知，取得独立底图后可直接替换。入场完成后的合成在压缩前逐像素等于原图，未改动最终画面。取消横向切片，书本始终为一组。紫色资源 4 完整固定于文档右侧，随页面自然滚动，不裁切展开。实现及验证见 `MOBILE_ADAPTATION_2026-09-07.md`。
24. 新 KV 的人物、五官、手臂、窗框、遮罩、标识、底图与旧版原始部件像素一致；本次保留既有适配和四张纸的摆放姿态，换入新《检测报告.png》和新的上滑提示原图。新包仅提供一张纸部件，其他三张纸沿用既有批准姿态，无新增绘制。横屏仍采用既有组合方式。
25. 新生产溯源完整图的“经营资质”卡片没有正文，也没有页脚说明，当前按原图保留留白；没有补写展示文案。真实检测文件未在本次素材包中提供，现有报告数据及文件关联继续使用原系统。
26. 首页批次号与检测日期的原稿是图片，未提供对应字体文件。默认值继续直接使用原图，逐像素保持现状；后台自定义值使用 Arial / Microsoft YaHei 系统字体，按原位置、字号和宽度缩放。若需要新数字与原稿字形完全一致，后续需提供原字体及使用授权；不影响当前后台维护和移动端展示。
