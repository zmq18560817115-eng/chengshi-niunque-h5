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

23. 新包没有独立的长图模块一黄色文件夹底层。按用户本轮反馈，现采用完整连续底图承载文件夹、结果卡底和人物，批次标题、说明、结果文字作为透明部件沿用入场时序；入场前文字下的肌理取自同张原图及原始粉色空卡，完成态由对应原图像素覆盖。取消横向切片入场。紫色资源 4 按用户明确要求完整固定于文档右侧，随页面自然滚动，不再裁切展开；若后续要求整张批次卡和人物也独立入场，需要补交被其遮挡的独立黄色文件夹底图。
24. 新 KV 的人物、五官、手臂、窗框、遮罩、标识、底图与旧版原始部件像素一致；本次保留既有适配和四张纸的摆放姿态，换入新《检测报告.png》和新的上滑提示原图。新包仅提供一张纸部件，其他三张纸沿用既有批准姿态，无新增绘制。横屏仍采用既有组合方式。
25. 新生产溯源完整图的“经营资质”卡片没有正文，也没有页脚说明，当前按原图保留留白；没有补写展示文案。真实检测文件未在本次素材包中提供，现有报告数据及文件关联继续使用原系统。
