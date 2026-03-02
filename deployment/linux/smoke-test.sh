#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"

echo "Checking $BASE_URL/api/health"
RESPONSE="$(curl -fsS "$BASE_URL/api/health")"
echo "$RESPONSE"

echo "$RESPONSE" | grep -q '"status":"ok"'
echo "Smoke test passed"
