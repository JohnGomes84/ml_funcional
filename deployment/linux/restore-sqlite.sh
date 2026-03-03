#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /opt/ml-gestao-total/backups/prod-YYYY-MM-DD-HHMMSS.db[.gz]"
  exit 1
fi

BACKUP_FILE="$1"
APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"
DB_PATH="${DB_PATH:-$APP_DIR/data/prod.db}"
SERVICE_NAME="${SERVICE_NAME:-ml-gestao-api}"
USE_SYSTEMD="${USE_SYSTEMD:-1}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
DB_OWNER="${DB_OWNER:-mlgestao:mlgestao}"
ROLLBACK_FILE=""

stop_service() {
  if [[ "$USE_SYSTEMD" == "1" ]]; then
    sudo systemctl stop "$SERVICE_NAME"
  fi
}

start_service() {
  if [[ "$USE_SYSTEMD" == "1" ]]; then
    sudo systemctl start "$SERVICE_NAME"
  fi
}

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [[ "${BACKUP_FILE##*.}" == "gz" ]]; then
  if ! command -v gunzip >/dev/null 2>&1; then
    echo "gunzip is required to restore .gz backups."
    exit 1
  fi
fi

if [[ -f "$BACKUP_FILE.sha256" ]]; then
  if ! sha256sum -c "$BACKUP_FILE.sha256"; then
    echo "Checksum validation failed for $BACKUP_FILE"
    exit 1
  fi
fi

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$DB_PATH")"

if [[ -f "$DB_PATH" ]]; then
  ROLLBACK_FILE="$BACKUP_DIR/pre-restore-$(date +%F-%H%M%S).db"
  cp "$DB_PATH" "$ROLLBACK_FILE"
  echo "Rollback point created: $ROLLBACK_FILE"
fi

stop_service

if [[ "${BACKUP_FILE##*.}" == "gz" ]]; then
  gunzip -c "$BACKUP_FILE" > "$DB_PATH"
else
  cp "$BACKUP_FILE" "$DB_PATH"
fi

if command -v sqlite3 >/dev/null 2>&1; then
  integrity="$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | tr -d '\r\n')"
  if [[ "$integrity" != "ok" ]]; then
    echo "Restore integrity check failed: $integrity"
    if [[ -n "$ROLLBACK_FILE" && -f "$ROLLBACK_FILE" ]]; then
      cp "$ROLLBACK_FILE" "$DB_PATH"
      echo "Previous database restored from rollback point."
    fi
    start_service
    exit 1
  fi
fi

if [[ "$USE_SYSTEMD" == "1" ]]; then
  sudo chown "$DB_OWNER" "$DB_PATH"
  sudo chmod 640 "$DB_PATH"
fi
start_service

echo "Restore completed: $BACKUP_FILE -> $DB_PATH"
