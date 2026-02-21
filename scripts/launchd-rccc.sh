#!/usr/bin/env bash
#
# LaunchAgent entrypoint: start CommandCenter RC in production mode after login/reboot.
# Installed via: pnpm deploy:rc (auto-copies plist on first run)
#
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

PROJECT_DIR="$HOME/www/rccc"
export NODE_ENV=production
export CC_DATA_DIR="$PROJECT_DIR/data"
export PORT=3232

load_nvm() {
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    nvm use --lts --silent 2>/dev/null || true
  fi
}

main() {
  load_nvm
  cd "$PROJECT_DIR/apps/dashboard"
  exec node --import tsx server.mjs
}

main "$@"
