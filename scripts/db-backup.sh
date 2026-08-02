#!/usr/bin/env sh
# Create a timestamped database backup using pg_dump.
# Usage: ./scripts/db-backup.sh [output-dir]

set -e

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="countdown_timer_${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

printf "Creating database backup: %s/%s\n" "$OUTPUT_DIR" "$FILENAME"

docker compose exec -T db pg_dump \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-countdown_timer}" \
  --clean --if-exists --no-owner \
  | gzip > "$OUTPUT_DIR/$FILENAME"

SIZE=$(ls -lh "$OUTPUT_DIR/$FILENAME" | awk '{print $5}')
printf "Backup complete: %s (%s)\n" "$FILENAME" "$SIZE"
