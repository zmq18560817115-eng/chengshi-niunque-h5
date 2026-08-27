#!/bin/sh
set -eu

# Next standalone tracing creates symlinks that are not available in every
# Windows development environment. Keep the normal cross-platform build gate
# unchanged while making the Linux/Docker release artifact explicit.
export NEXT_STANDALONE=true
exec pnpm build
