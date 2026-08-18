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
