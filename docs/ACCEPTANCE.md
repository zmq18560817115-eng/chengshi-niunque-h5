# Preparation-stage Acceptance

- [x] `/` opens with all reserved H5 sections.
- [x] `/admin` and `/admin/login` are included in the successful production build.
- [x] `/api/health` is tested and included in the successful production build.
- [x] Required directories and responsibilities are clear.
- [x] Prisma includes seven required entities, relations, ordering, lifecycle, timestamps, and operators.
- [x] Design is mapped and unknowns say 待设计确认.
- [x] `.env.example` contains placeholders only.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm prisma:validate`, and `pnpm build` pass.
- [x] Both Compose YAML files parse; Docker CLI runtime validation is unavailable on this machine.
- [x] Open decisions are centralized.

Optional browser smoke test: `pnpm test:e2e` after `pnpm test:e2e:install`.
