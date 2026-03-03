#!/usr/bin/env bash
set -euo pipefail

pnpm vitest run --config vitest.server.config.ts \
  server/routes/auth.http.test.ts \
  server/routes/auth.flows.test.ts
