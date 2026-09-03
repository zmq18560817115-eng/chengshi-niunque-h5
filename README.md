# chengshi-niunque-h5

诚实纽雀检测报告 H5 与内容管理后台。一个 Next.js 服务同时提供前台展示、后台管理和 API，不需要分别部署两套程序。

## 部署后的访问入口

- H5 引导页：`https://你的域名/go`
- H5 档案首页：`https://你的域名/reports`
- 后台登录：`https://你的域名/admin/login`
- 后台工作台：`https://你的域名/admin`
- 健康检查：`https://你的域名/api/health`

后台发布的分类、卡片与 PDF/图片资料由同一服务提供给 H5。公司部署时只需配置一个域名；如需将后台限制为内网访问，可在 Nginx 或公司网关中单独限制 `/admin`，不要阻断 `/reports` 与公开资料读取接口。

## 本地运行

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pnpm start
```

环境变量名称见 `.env.example`。生产环境必须使用独立的 PostgreSQL、S3 兼容对象存储、强随机 `SESSION_SECRET` 和管理员初始凭据，真实 `.env` 不得提交到 Git。

完整的文件边界、备份、迁移、替换和回滚流程见 `docs/DEPLOYMENT_HANDOFF.md`。

## 750px 设计稿的 vw 适配

项目根布局已经通过 Next.js 的 `viewport` 配置生成以下等价标签，不要再手写第二个重复标签：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

换算公式：`vw = 设计稿 px ÷ 750 × 100`。

例如设计稿中的卡片宽 `200px`、高 `100px`，手动换算后是：

```css
.mobile-card {
  width: 26.666667vw; /* 200 ÷ 750 × 100 */
  height: 13.333333vw; /* 100 ÷ 750 × 100 */
}
```

项目已经配置 PostCSS 自动换算。为避免把既有的 375px CSS、后台样式、断点和触控阈值重复换算，只有文件名以 `.vw.css` 或 `.vw.module.css` 结尾的样式文件会转换。在这类文件中可以直接按 750px 设计稿写：

```css
/* card.vw.module.css */
.mobileCard {
  width: 200px;
  height: 100px;
  border: 1px solid #ddd;
}
```

构建后 `200px` 和 `100px` 会分别转换成 `26.666667vw` 和 `13.333333vw`。`1px` 细线会保留为 `1px`，媒体查询中的 px 也不会转换。项目里的实际用法可参考 `src/app/guide-adaptation.vw.css`：移动端按 750×1625 原始画布生成 `100vw × 216.666667vw`，桌面端仍封顶为 750×1625px。不要把整个 `globals.css` 改名为 `.vw.css`。

没有 PostCSS 构建流程的纯静态 HTML/CSS/JS 项目，CSS 本身不能自动把源码中的 px 改成 vw，需要使用上面的公式手动换算，或先接入 PostCSS 再使用同样配置。
