#!/usr/bin/env bash
#
# One-command RC deploy: clone/pull, install, build, restart service.
# Usage: pnpm deploy:rc            (from repo root)
#        bash scripts/deploy-rc.sh (directly)
#
set -euo pipefail

REPO_URL="git@github.com:holiber/cc.git"
RC_DIR="$HOME/www/rc-cc"
BRANCH="${1:-rc}"
LABEL="com.gatocube.rc-cc"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

load_nvm() {
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    nvm use --lts --silent 2>/dev/null || true
  fi
}

ensure_launchd() {
  local src="$RC_DIR/scripts/com.gatocube.rc-cc.plist"
  if [ ! -f "$PLIST" ]; then
    echo "[deploy-rc] Installing launchd plist → $PLIST"
    cp "$src" "$PLIST"
    launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  fi
}

main() {
  load_nvm

  if [ ! -d "$RC_DIR/.git" ]; then
    echo "[deploy-rc] Cloning $REPO_URL → $RC_DIR"
    git clone "$REPO_URL" "$RC_DIR"
  fi

  cd "$RC_DIR"

  local current
  current="$(git branch --show-current)"
  if [ "$current" != "$BRANCH" ]; then
    echo "[deploy-rc] Switching to branch $BRANCH"
    git fetch origin
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
  fi

  echo "[deploy-rc] Pulling latest changes"
  git pull --ff-only origin "$BRANCH" || git pull origin "$BRANCH"

  echo "[deploy-rc] Installing dependencies"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install

  echo "[deploy-rc] Building"
  pnpm build

  mkdir -p "$RC_DIR/data"

  # Push database schema from source when DB is empty/missing.
  # Production builds skip `push: true`, so we briefly start dev mode to init.
  local db_file="$RC_DIR/data/cc.db"
  if [ ! -f "$db_file" ] || [ ! -s "$db_file" ]; then
    echo "[deploy-rc] Fresh database detected, pushing schema from source..."
    CC_DATA_DIR="$RC_DIR/data" bash "$RC_DIR/scripts/push-db.sh" || {
      echo "[deploy-rc] WARNING: schema push failed (non-fatal)"
    }
  fi

  ensure_launchd

  echo "[deploy-rc] Restarting service ($LABEL)"
  launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || {
    echo "[deploy-rc] Service not running yet, bootstrapping"
    launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  }

  echo ""
  echo "  RC deployed: https://rccc.gatocube.com"
  echo "  Local:       http://127.0.0.1:3232"
  echo "  Branch:      $BRANCH"
  echo "  Dir:         $RC_DIR"
  echo "  Logs:        tail -f ~/Library/Logs/$LABEL.log"
  echo ""

  # Wait for the RC server to become healthy before running smoke tests.
  echo "[deploy-rc] Waiting for server to become healthy..."
  local healthy=false
  for i in $(seq 1 30); do
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3232/admin/login" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
      echo "[deploy-rc] Server healthy (HTTP 200)"
      healthy=true
      break
    fi
    sleep 2
  done

  if [ "$healthy" != "true" ]; then
    echo "[deploy-rc] WARNING: server did not become healthy within 60s, skipping smoke tests"
    return 0
  fi

  # Resolve the workspace root (where this script lives, one level up from scripts/).
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local workspace_root
  workspace_root="$(cd "$script_dir/.." && pwd)"

  echo "[deploy-rc] Running smoke tests against http://127.0.0.1:3232"
  BASE_URL=http://127.0.0.1:3232 CC_REUSE_SERVERS=1 \
    pnpm -C "$workspace_root/apps/dashboard" exec playwright test tests/all-pages.spec.ts \
    --reporter=list || {
      echo "[deploy-rc] Smoke tests FAILED"
      exit 1
    }
  echo "[deploy-rc] Smoke tests passed"
}

main "$@"
