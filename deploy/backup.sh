#!/usr/bin/env bash
# Nightly backup of the promptgalaxy_prod database and the uploads directory.
# Runs as root from /etc/cron.d/promptgalaxy-backup. Exits non-zero (and logs) on any problem.
set -euo pipefail

BACKUP_DIR=/var/backups/promptgalaxy
UPLOADS_DIR=/opt/apps/thepromptgalaxy/uploads
KEEP=14
STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
runuser -u postgres -- pg_dump -Fc promptgalaxy_prod > "$DB_FILE"

# A dump that is tiny or unreadable is a failed backup, never a successful one.
if [ "$(stat -c %s "$DB_FILE")" -lt 1024 ]; then
  echo "$(date -Is) ERROR: $DB_FILE is smaller than 1 KB" >&2
  exit 1
fi
pg_restore --list "$DB_FILE" > /dev/null
ln -sfn "$DB_FILE" "$BACKUP_DIR/latest-db.dump"

if [ -d "$UPLOADS_DIR" ]; then
  UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
  tar -czf "$UP_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  tar -tzf "$UP_FILE" > /dev/null
  ln -sfn "$UP_FILE" "$BACKUP_DIR/latest-uploads.tar.gz"
fi

# Keep the newest $KEEP of each kind.
ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --

echo "$(date -Is) OK: $(basename "$DB_FILE") $(stat -c %s "$DB_FILE") bytes"
