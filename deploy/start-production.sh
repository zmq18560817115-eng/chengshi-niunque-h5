#!/bin/sh
set -eu

pnpm prisma migrate deploy
pnpm storage:ensure
pnpm content:bootstrap
pnpm content:verify
pnpm admin:seed
pnpm admin:verify

# Docker copies the standalone server to the application root. A PM2 deployment
# runs from the repository root instead, where Next keeps it under .next.
# Supporting both paths keeps the same checked startup sequence for every
# production process manager.
if [ -f server.js ]; then
  exec node server.js
fi

if [ -f .next/standalone/server.js ]; then
  # Next standalone changes its runtime directory to .next/standalone. The
  # build intentionally does not copy public or .next/static there, so a PM2
  # source deployment must stage both directories before starting the server.
  mkdir -p .next/standalone/public .next/standalone/.next/static
  cp -R public/. .next/standalone/public/
  cp -R .next/static/. .next/standalone/.next/static/

  test -f .next/standalone/public/design/guide/guide-first-frame.webp
  test -f .next/standalone/public/design/final-v1/archive-reference.webp
  exec node .next/standalone/server.js
fi

echo "Production server entrypoint was not found. Run pnpm build before starting the service." >&2
exit 1
