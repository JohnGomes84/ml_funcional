#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"
SERVICE_NAME="${SERVICE_NAME:-ml-gestao-api}"
CHECK_SYSTEMD="${CHECK_SYSTEMD:-1}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-26}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-10}"

failures=0

report_ok() {
  echo "[OK] $1"
}

report_fail() {
  echo "[FAIL] $1"
  failures=$((failures + 1))
}

if [[ "$CHECK_SYSTEMD" != "1" ]]; then
  report_ok "systemd check skipped (CHECK_SYSTEMD=$CHECK_SYSTEMD)"
elif systemctl is-active --quiet "$SERVICE_NAME"; then
  report_ok "systemd service active: $SERVICE_NAME"
else
  report_fail "systemd service inactive: $SERVICE_NAME"
fi

if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "$BASE_URL/api/health" >/dev/null; then
  report_ok "health endpoint reachable: $BASE_URL/api/health"
else
  report_fail "health endpoint unavailable: $BASE_URL/api/health"
fi

shopt -s nullglob
backup_files=( "$BACKUP_DIR"/prod-*.db "$BACKUP_DIR"/prod-*.db.gz )
shopt -u nullglob

if (( ${#backup_files[@]} == 0 )); then
  report_fail "no backup files found in $BACKUP_DIR"
else
  latest_backup="$(ls -1t "${backup_files[@]}" | head -n 1)"
  backup_ts="$(stat -c %Y "$latest_backup")"
  now_ts="$(date +%s)"
  age_hours="$(( (now_ts - backup_ts) / 3600 ))"
  if (( age_hours > MAX_BACKUP_AGE_HOURS )); then
    report_fail "latest backup is too old (${age_hours}h): $latest_backup"
  else
    report_ok "latest backup age ${age_hours}h: $latest_backup"
  fi
fi

disk_usage="$(df -P "$APP_DIR" | awk 'NR==2 {gsub("%","",$5); print $5}')"
if [[ -z "$disk_usage" ]]; then
  report_fail "unable to read disk usage for $APP_DIR"
elif (( disk_usage >= DISK_WARN_PERCENT )); then
  report_fail "disk usage ${disk_usage}% is above threshold ${DISK_WARN_PERCENT}%"
else
  report_ok "disk usage ${disk_usage}% under threshold ${DISK_WARN_PERCENT}%"
fi

if (( failures > 0 )); then
  echo "Operational check finished with ${failures} failure(s)."
  exit 1
fi

echo "Operational check passed."
