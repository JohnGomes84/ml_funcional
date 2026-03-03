#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="${SMOKE_LOG_FILE:-/tmp/ml-gestao-smoke.log}"
STARTUP_SECONDS="${STARTUP_SECONDS:-8}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-30}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting API for local smoke test..."
pnpm start >"${LOG_FILE}" 2>&1 &
SERVER_PID="$!"

sleep "${STARTUP_SECONDS}"

echo "Running smoke test against ${BASE_URL}"
if ! BASE_URL="${BASE_URL}" HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS}" HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS}" bash deployment/linux/smoke-test.sh; then
  printf "\nSmoke failed. Last server logs (%s):\n" "${LOG_FILE}"
  tail -n 120 "${LOG_FILE}" || true
  exit 1
fi

echo "Local smoke test passed."
