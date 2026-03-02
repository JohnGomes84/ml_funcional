#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"

cd "$APP_DIR"

echo "[1/5] Installing dependencies"
pnpm install --frozen-lockfile

echo "[2/5] Type checking"
pnpm check
pnpm run check:server

echo "[3/5] Building server"
pnpm run build:server

echo "[4/5] Building frontend"
pnpm build

echo "[5/5] Ensuring data dir"
mkdir -p "$APP_DIR/data"

echo "Done. Next: systemctl restart ml-gestao-api && run smoke-test.sh"
