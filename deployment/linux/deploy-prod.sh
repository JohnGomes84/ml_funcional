#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"
RUN_TESTS="${RUN_TESTS:-1}"
RUN_SMOKE="${RUN_SMOKE:-0}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"

cd "$APP_DIR"

if [[ ! -f "$APP_DIR/.env.local" ]]; then
  echo ".env.local not found in $APP_DIR"
  echo "Use deployment/linux/.env.production.example as baseline."
  exit 1
fi

echo "[1/5] Installing dependencies"
pnpm install --frozen-lockfile --prod=false

echo "[2/5] Type checking"
pnpm check
pnpm run check:server

if [[ "$RUN_TESTS" == "1" ]]; then
  echo "[3/6] Running tests"
  pnpm run test
  build_step_server="[4/6]"
  build_step_frontend="[5/6]"
  finish_step="[6/6]"
else
  build_step_server="[3/5]"
  build_step_frontend="[4/5]"
  finish_step="[5/5]"
fi

echo "$build_step_server Building server"
pnpm run build:server

echo "$build_step_frontend Building frontend"
pnpm build

echo "$finish_step Ensuring data dirs and permissions"
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/backups"
chmod 750 "$APP_DIR/data" "$APP_DIR/backups"

echo "Done. Next:"
echo "  sudo systemctl restart ml-gestao-api"
echo "  BASE_URL=$BASE_URL bash deployment/linux/smoke-test.sh"

if [[ "$RUN_SMOKE" == "1" ]]; then
  BASE_URL="$BASE_URL" bash deployment/linux/smoke-test.sh
  echo "Smoke test completed."
fi
