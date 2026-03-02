#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"
DB_PATH="${DB_PATH:-$APP_DIR/data/prod.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F-%H%M%S)"
FILE="$BACKUP_DIR/prod-$STAMP.db"

cp "$DB_PATH" "$FILE"

echo "Backup created: $FILE"

# Keep last 30 backups
ls -1t "$BACKUP_DIR"/prod-*.db 2>/dev/null | tail -n +31 | xargs -r rm -f
