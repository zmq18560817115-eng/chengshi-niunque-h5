#!/bin/sh
set -eu

pnpm prisma migrate deploy
pnpm storage:ensure
pnpm admin:seed
pnpm admin:verify

exec node server.js
