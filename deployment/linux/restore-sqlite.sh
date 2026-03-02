#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /opt/ml-gestao-total/backups/prod-YYYY-MM-DD-HHMMSS.db"
  exit 1
fi

BACKUP_FILE="$1"
APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"
DB_PATH="${DB_PATH:-$APP_DIR/data/prod.db}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

sudo systemctl stop ml-gestao-api
cp "$BACKUP_FILE" "$DB_PATH"
sudo systemctl start ml-gestao-api

echo "Restore completed: $BACKUP_FILE -> $DB_PATH"
