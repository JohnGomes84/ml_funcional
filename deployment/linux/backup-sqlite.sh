#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ml-gestao-total}"
DB_PATH="${DB_PATH:-$APP_DIR/data/prod.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
KEEP_LAST="${KEEP_LAST:-30}"
COMPRESS_BACKUP="${COMPRESS_BACKUP:-1}"
OFFSITE_S3_URI="${OFFSITE_S3_URI:-}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F-%H%M%S)"
BASE_FILE="$BACKUP_DIR/prod-$STAMP.db"
TMP_FILE="$BASE_FILE"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found: $DB_PATH"
  exit 1
fi

if command -v sqlite3 >/dev/null 2>&1; then
  # Consistent online backup while application is running.
  sqlite3 "$DB_PATH" ".timeout 5000" ".backup $TMP_FILE"
  integrity="$(sqlite3 "$TMP_FILE" "PRAGMA integrity_check;" | tr -d '\r\n')"
  if [[ "$integrity" != "ok" ]]; then
    echo "Backup integrity check failed: $integrity"
    rm -f "$TMP_FILE"
    exit 1
  fi
else
  cp "$DB_PATH" "$TMP_FILE"
fi

BACKUP_FILE="$TMP_FILE"
if [[ "$COMPRESS_BACKUP" == "1" ]]; then
  gzip -f "$TMP_FILE"
  BACKUP_FILE="$TMP_FILE.gz"
fi

sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
echo "Backup created: $BACKUP_FILE"

if [[ -n "$OFFSITE_S3_URI" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "OFFSITE_S3_URI configured but aws CLI not found."
    exit 1
  fi
  aws s3 cp "$BACKUP_FILE" "$OFFSITE_S3_URI/"
  aws s3 cp "$BACKUP_FILE.sha256" "$OFFSITE_S3_URI/"
  echo "Offsite upload completed: $OFFSITE_S3_URI"
fi

# Keep only newest N backup payloads and their checksums.
shopt -s nullglob
backup_payloads=( "$BACKUP_DIR"/prod-*.db "$BACKUP_DIR"/prod-*.db.gz )
shopt -u nullglob

if (( ${#backup_payloads[@]} > KEEP_LAST )); then
  while IFS= read -r old_payload; do
    rm -f "$old_payload" "$old_payload.sha256"
  done < <(ls -1t "${backup_payloads[@]}" | tail -n +"$((KEEP_LAST + 1))")
fi

# Also prune by age.
find "$BACKUP_DIR" -type f \( -name "prod-*.db" -o -name "prod-*.db.gz" -o -name "prod-*.db.sha256" -o -name "prod-*.db.gz.sha256" \) -mtime +"$KEEP_DAYS" -delete
