# Project instructions

- Mobile-first H5, 375px reference width; keep `docs/input/` read-only.
- Do not invent final visuals. Record uncertainty in `docs/OPEN_QUESTIONS.md`.
- Use tokens in `src/app/globals.css`; keep server code in `src/server/`.
- Access data through Prisma and files through the storage abstraction.
- Use pnpm exclusively. Install with `pnpm install --frozen-lockfile`; do not create or commit `package-lock.json`.
- Required gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm prisma:validate`, and `pnpm build`.
- Never commit credentials or uploaded files.
- Do not push or deploy unless explicitly requested.

Directories: `src/app` routes/API, `src/components/h5` public UI, `src/components/admin` admin UI, `src/server` adapters/services, `prisma` schema, `tests` automated tests, `deploy` deployment reservations, `docs` decisions and evidence.
