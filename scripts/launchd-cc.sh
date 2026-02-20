#!/usr/bin/env bash
#
# LaunchAgent entrypoint: start CommandCenter in production mode after login/reboot.
# Installed via: cp scripts/com.gatocube.cc.plist ~/Library/LaunchAgents/
#
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

PROJECT_DIR="$HOME/www/cc"
export NODE_ENV=production
export CC_DATA_DIR="$PROJECT_DIR/data"
export PORT=3222

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
