#!/bin/sh
set -eu

pnpm prisma migrate deploy
pnpm storage:ensure
pnpm content:bootstrap
pnpm content:verify
pnpm admin:seed
pnpm admin:verify

exec node server.js
