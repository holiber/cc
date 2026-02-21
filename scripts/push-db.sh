#!/usr/bin/env bash
#
# Push Payload database schema from source using dev mode.
# Production builds skip `push: true`, so this script starts the dev server
# briefly, triggers Payload init (which pushes schema + seeds data), then exits.
#
# Usage: CC_DATA_DIR=/path/to/data bash scripts/push-db.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_DIR="$REPO_ROOT/apps/dashboard"

PORT="${PUSH_DB_PORT:-3299}"

if [ -z "${CC_DATA_DIR:-}" ]; then
  echo "[push-db] ERROR: CC_DATA_DIR must be set"
  exit 1
fi

mkdir -p "$CC_DATA_DIR"

echo "[push-db] Pushing schema to $CC_DATA_DIR (port $PORT)..."

cd "$DASHBOARD_DIR"
CC_DATA_DIR="$CC_DATA_DIR" PORT="$PORT" node --import tsx server.mjs &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be ready
for i in $(seq 1 30); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" 2>/dev/null || echo "000")
  if [ "$code" != "000" ]; then
    break
  fi
done

# Trigger Payload init (lazy-loaded on first request)
curl -s -o /dev/null "http://127.0.0.1:$PORT/admin/login" 2>/dev/null
sleep 5

# Verify tables exist
DB_FILE=$(find "$CC_DATA_DIR" -name "*.db" -type f 2>/dev/null | head -1)
if [ -n "$DB_FILE" ] && sqlite3 "$DB_FILE" ".tables" 2>/dev/null | grep -q users; then
  echo "[push-db] Schema pushed and seeded successfully."
else
  echo "[push-db] WARNING: Tables may not have been created."
  exit 1
fi
