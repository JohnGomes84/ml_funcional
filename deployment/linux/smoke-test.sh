#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-30}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

echo "Checking $BASE_URL/api/health (timeout: ${HEALTH_TIMEOUT_SECONDS}s)"
start_ts="$(date +%s)"
response=""

while true; do
  if response="$(curl -fsS "$BASE_URL/api/health" 2>/dev/null)"; then
    break
  fi

  now_ts="$(date +%s)"
  elapsed="$((now_ts - start_ts))"
  if (( elapsed >= HEALTH_TIMEOUT_SECONDS )); then
    echo "Smoke test failed: API indisponivel em $BASE_URL/api/health apos ${elapsed}s."
    echo "Garanta que o backend esteja ativo antes de executar o smoke test."
    exit 1
  fi

  sleep "$HEALTH_INTERVAL_SECONDS"
done

echo "$response"
echo "$response" | grep -q '"status":"ok"'
echo "Smoke test passed"
