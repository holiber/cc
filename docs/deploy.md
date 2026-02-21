# Deploy & Release Process

## Branch strategy

```
staging ──► rc ──► main
```

| Branch    | Purpose                        | Database               | Served at                   |
|-----------|--------------------------------|------------------------|-----------------------------|
| `staging` | Development. PRs target here.  | Own SQLite (`.cache/`) | `localhost:3222` (dev mode) |
| `rc`      | Release candidate under test.  | Own SQLite (`~/www/rccc/data/`) | `rccc.gatocube.com` (port 3232) |
| `main`    | Stable production release.     | Production SQLite      | `cc.gatocube.com` via Cloudflare Tunnel |

## Infrastructure

Production and RC run on a local Mac behind **Cloudflare Tunnel**.

- Tunnel config: `~/.cloudflared/config.toolsback.yml`
- Routes:
  - `cc.gatocube.com` → `127.0.0.1:3222` (production)
  - `rccc.gatocube.com` → `127.0.0.1:3232` (release candidate)
- The `cloudflared` daemon is kept alive by `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist` (`RunAtLoad + KeepAlive`).

The apps are kept alive by launchd agents:

| Instance   | Plist label           | Script                      | Logs prefix                  |
|------------|-----------------------|-----------------------------|------------------------------|
| Production | `com.gatocube.cc`     | `scripts/launchd-cc.sh`     | `~/Library/Logs/com.gatocube.cc` |
| RC         | `com.gatocube.rccc`  | `scripts/launchd-rccc.sh`  | `~/Library/Logs/com.gatocube.rccc` |


## Database

Payload CMS uses SQLite (`@payloadcms/db-sqlite`). The DB path is controlled by `CC_DATA_DIR`:

| Environment | DB location                         |
|-------------|-------------------------------------|
| Dev         | `.cache/data/dashboard/cc.db`       |
| Test (E2E)  | `.cache/cc-test-<timestamp>/cc.db`  |
| RC          | `~/www/rccc/data/cc.db`            |
| Production  | `~/www/cc/data/cc.db`               |

### Migrations

Payload handles schema migrations:

```bash
# generate a migration after changing a collection
pnpm -F @command-center/dashboard exec payload migrate:create

# apply pending migrations
pnpm -F @command-center/dashboard exec payload migrate
```

## Build & run

```bash
# Development
pnpm dev                      # starts server.mjs in dev mode on port 3222

# Production build
pnpm build                    # runs generate-ws-asyncapi + next build

# Production start
cd apps/dashboard
NODE_ENV=production node --import tsx server.mjs
```

## RC deploy (one command)

```bash
pnpm deploy:rc            # default: deploys the `rc` branch
pnpm deploy:rc staging    # deploy a different branch to RC
```

This runs `scripts/deploy-rc.sh` which:

1. Clones the repo to `~/www/rccc/` (first run only)
2. Checks out the target branch and pulls latest
3. Installs dependencies and builds
4. Pushes database schema from source (fresh DBs only)
5. Installs the launchd plist (first run only)
6. Restarts the `com.gatocube.rccc` service
7. Waits for the server to become healthy (HTTP 200)
8. Runs smoke tests (`all-pages.spec.ts`) against `http://127.0.0.1:3232` -- fails the deploy if tests fail

After deploying, the RC is available at **https://rccc.gatocube.com** (local: `http://127.0.0.1:3232`).

RC uses its own SQLite database at `~/www/rccc/data/cc.db`, fully isolated from production.

To run the smoke tests independently (without redeploying):

```bash
pnpm test:rc
```

## Release checklist

### 1. Prepare RC

```bash
git checkout rc
git merge staging
```

### 2. Test with production data

```bash
# copy production DB
cp ~/www/cc/data/cc.db .cache/data/dashboard/cc.db

# apply migrations if schema changed
pnpm -F @command-center/dashboard exec payload migrate

# build and start locally
pnpm build
cd apps/dashboard && NODE_ENV=production node --import tsx server.mjs
```

Verify the app works at `http://localhost:3222`. Run tests against it:

```bash
pnpm test
```

### 3. Deploy to production

```bash
git checkout main
git merge rc
git push cc main

# rebuild production
cd ~/www/cc
git pull
pnpm install
pnpm build

# restart the launchd service
launchctl kickstart -k gui/$(id -u)/com.gatocube.cc
```

### 4. Verify

Open `https://cc.gatocube.com` and confirm the release is live.

## Launchd setup (one-time)

### Production

```bash
cp scripts/com.gatocube.cc.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.gatocube.cc.plist
```

### RC

The `pnpm deploy:rc` script installs the plist automatically on first run. To install manually:

```bash
cp scripts/com.gatocube.rccc.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.gatocube.rccc.plist
```

### Manage services

Replace `LABEL` with `com.gatocube.cc` (production) or `com.gatocube.rccc` (RC):

```bash
# status
launchctl print gui/$(id -u)/LABEL

# restart
launchctl kickstart -k gui/$(id -u)/LABEL

# stop
launchctl bootout gui/$(id -u)/LABEL

# start
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/LABEL.plist

# logs
tail -f ~/Library/Logs/LABEL.log
tail -f ~/Library/Logs/LABEL.err.log
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank admin page with `ChunkLoadError` / `ERR_QUIC_PROTOCOL_ERROR` | Disable HTTP/3 (QUIC) for the Cloudflare zone |
| Port 3222 busy on dev start | `server.mjs` auto-detects and switches to an ephemeral port; or kill the old process |
| `Cannot find module '@tailwindcss/postcss'` | Run `pnpm install` — Turbopack needs it resolved locally |
