#!/usr/bin/env bash
#
# Build, pack, and publish @command-center/api + @command-center/client
# as a GitHub release with downloadable tarballs.
#
# Usage:
#   bash scripts/release-packages.sh          # uses version from root package.json
#   bash scripts/release-packages.sh v0.2.0   # override version
#
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:-v$(node -p "require('./package.json').version")}"
TAG="$VERSION"
DIST_DIR=".cache/release"

echo "[release] Version: $VERSION"
echo "[release] Building packages..."

pnpm build:packages

echo "[release] Packing tarballs..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# pnpm pack resolves workspace:* to real versions automatically
pnpm -C packages/api pack --pack-destination "../../$DIST_DIR"
pnpm -C packages/client pack --pack-destination "../../$DIST_DIR"

API_TGZ=$(ls "$DIST_DIR"/command-center-api-*.tgz 2>/dev/null | head -1)
CLIENT_TGZ=$(ls "$DIST_DIR"/command-center-client-*.tgz 2>/dev/null | head -1)

if [ -z "$API_TGZ" ] || [ -z "$CLIENT_TGZ" ]; then
    echo "[release] ERROR: tarballs not found in $DIST_DIR"
    ls -la "$DIST_DIR"
    exit 1
fi

echo "[release] Tarballs:"
echo "  $API_TGZ"
echo "  $CLIENT_TGZ"

echo "[release] Creating git tag $TAG..."
git tag -f "$TAG"
git push cc "$TAG" --force 2>/dev/null || git push origin "$TAG" --force 2>/dev/null || true

echo "[release] Creating GitHub release $TAG..."
gh release create "$TAG" \
    --repo holiber/cc \
    --title "CommandCenter $VERSION" \
    --notes "$(cat <<EOF
## Installation

\`\`\`bash
# API server (Elysia + Zod schemas)
npm install https://github.com/holiber/cc/releases/download/$TAG/$(basename "$API_TGZ")

# Client (CLI + MCP server + Eden Treaty client)
npm install https://github.com/holiber/cc/releases/download/$TAG/$(basename "$CLIENT_TGZ")
\`\`\`

## CLI usage

\`\`\`bash
npx cc-cli --url https://your-server/api/v1 health
npx cc-cli knock --name myAgent --role agent --intent "connect" --secret mysecret
\`\`\`

## MCP usage

Add to \`.cursor/mcp.json\`:
\`\`\`json
{
  "mcpServers": {
    "command-center": {
      "command": "npx",
      "args": ["cc-mcp"],
      "env": { "CC_API_URL": "https://your-server/api/v1" }
    }
  }
}
\`\`\`
EOF
)" \
    "$API_TGZ" "$CLIENT_TGZ"

echo ""
echo "[release] Done! Release: https://github.com/holiber/cc/releases/tag/$TAG"
