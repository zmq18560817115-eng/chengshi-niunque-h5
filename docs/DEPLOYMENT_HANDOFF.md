# 部署替换与文件边界

## 目标

本项目采用“程序可整体替换、业务数据与密钥独立保留”的部署方式。生产发布只替换应用镜像和 Nginx 配置，不覆盖 PostgreSQL 数据、对象存储文件或生产环境变量。

同一个应用容器同时提供两套界面：面向用户的 H5 使用 `/go`、`/reports`，面向运营人员的管理台使用 `/admin/login`、`/admin`。默认通过同一域名和同一 Nginx 入口访问，不需要部署两套代码或维护两份业务数据。若公司要求后台仅内网开放，应在网关层限制 `/admin` 路径，同时保留 H5、公开内容 API 和报告文件读取路由。

## 四类文件

### 1. 可随版本整体替换的程序文件

- `src/`：前台、后台、API 和服务端代码。
- `public/`：随版本发布的固定视觉资源；不是后台上传文件。
- `prisma/schema.prisma`、`prisma/migrations/`：数据库结构及增量迁移。
- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`：依赖锁定。
- `next.config.ts`、`tsconfig.json`、构建和样式配置。
- `Dockerfile`、`compose.production.yaml`、`deploy/nginx/`：程序镜像与入口代理定义。

推荐以 Git 提交或不可变 Docker 镜像作为发布单元，禁止在生产容器内手工修改这些文件。

### 2. 部署时必须保留、不得被程序包覆盖的数据

- PostgreSQL 数据库：管理员、会话、分类、卡片、报告资料元数据、发布记录和审计日志。
- S3/MinIO bucket：后台上传的 PDF、图片等对象；数据库只保存对象 key。
- PostgreSQL 与对象存储的备份、恢复记录。

这些数据不在仓库中。替换应用镜像前必须先备份；回滚程序版本不能替代数据库回滚。

### 3. 每个环境单独维护、不得进入镜像或 Git 的配置

- `.env` 及生产密钥。
- `DATABASE_URL`。
- `S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_FORCE_PATH_STYLE`。
- `SESSION_SECRET`。
- 管理员初始化使用的 `ADMIN_SEED_USERNAME`、`ADMIN_SEED_DISPLAY_NAME`、`ADMIN_SEED_PASSWORD`。
- `NEXT_PUBLIC_SITE_URL`。

`.env.example` 仅用于说明变量名，不能直接作为生产凭据。`.dockerignore` 已排除真实 `.env`，避免其进入 Docker 构建上下文。

### 4. 研发证据与非运行时资料

- `docs/input/`：原始设计输入，只读，不进入生产镜像。
- `docs/`：架构、验收、部署和审计说明。
- `tests/`、`vitest.config.ts`、`playwright.config.ts`：发布前验证资料。
- `scripts/build-*`、`scripts/audit-*`、`scripts/verify-*`：素材构建与验证工具。
- `docs/audit-*`、`playwright-report/`、`test-results/`：本地测试产物，不进入生产镜像。

## 标准替换流程

1. 备份 PostgreSQL 和对象存储 bucket，并验证备份可读。
2. 对目标提交运行 `pnpm install --frozen-lockfile`。
3. 依次通过 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm prisma:validate`、`pnpm build`。
4. 构建带唯一版本号的应用镜像，不覆盖旧镜像标签。
5. 替换 `app` 容器，保持 PostgreSQL、S3/MinIO 和 `.env` 不变。容器入口会依次执行数据库迁移、对象存储连通与 bucket 检查、默认 H5 分类与卡片初始化及前台可见性自检、管理员初始化及登录自检，任一步失败都不会启动 Web 服务。首次空库会建立与当前 H5 对应的三个固定分类和八张固定卡片；已有运营内容不会被覆盖。
6. 修改管理员账号或密码后，更新服务器 `.env` 并重新创建 `app` 容器；初始化会停用旧管理员、撤销旧会话并清理旧登录限流记录。
7. 验证 `/api/health`、`/api/public/content`、前台 `/go` 与 `/reports`、后台 `/admin` 与 `/admin/modules`。
8. 若失败，先回滚应用镜像；涉及不兼容数据库迁移时，按迁移方案处理，禁止直接覆盖数据卷。

若升级旧环境时，入口在“默认前后台内容校验”处停止，说明已存在的固定卡片仍处于草稿、前台不可见。确认这些卡片确实应恢复为当前 H5 的固定结构后，在备份数据库后人工运行一次 `pnpm content:repair`，再重新创建 `app` 容器。该修复命令只提升默认固定卡片的草稿状态；自动部署不会运行它，因此后续运营人员主动下线的内容不会被版本发布改回上线。

## 使用 PM2 的服务器

PM2 **不得**直接运行 `server.js` 或 `.next/standalone/server.js`。直接运行会绕过内容初始化，造成“后台可登录但分类、卡片均为 0，三级页 404”的假成功部署。

在服务器应用目录中完成依赖安装和构建后，使用仓库提供的配置启动：

```sh
pnpm install --frozen-lockfile
pnpm build
pm2 startOrReload deploy/ecosystem.config.cjs --only honest-nutri-report-h5 --update-env
pm2 save
```

该配置会执行 `deploy/start-production.sh`：先迁移、确认 MinIO、补齐三个固定分类和八张固定卡片、校验前台可访问性及管理员登录，全部成功后才启动 Next standalone 服务。启动后必须验证：

```sh
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/public/content
```

第一条必须返回 `status: ok`，第二条必须包含 `inspection-projects`、`review-assurance`、`production-traceability` 三个分类；任何一条不满足都不能对外宣称部署完成。

## 当前生产编排边界

`compose.production.yaml` 启动 `app` 与 `nginx`，并等待应用健康检查通过后才开放 Nginx。它假定 PostgreSQL 和 S3 兼容对象存储已经由外部平台提供，并通过 `.env` 注入连接信息。若目标服务器需要把数据库和 MinIO 一起部署，必须另建生产基础设施编排并设置持久卷、备份、监控和访问控制，不能直接把本地 `compose.yaml` 当作生产方案。

## 上线前仍需确认

- 生产域名、HTTPS 证书和反向代理安全头。
- PostgreSQL 与对象存储的生产地址、持久卷、备份周期和恢复演练。
- 数据库迁移失败后的回滚负责人和处理流程。
- 管理员初始账号交付及密码轮换方式。
- 由运维平台持续探测 `/api/health`；该接口会同时检查数据库和对象存储，任一异常时返回 503。
- 仓库根目录中的 `h origin main`、`h origin maingit status` 是已跟踪的异常文本文件，运行时不需要；删除前需确认是否仍有取证价值。
