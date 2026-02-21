# AGENTS.md

This file provides context for AI agents working in this repository.

## Project overview

CommandCenter is a monorepo for an internal dashboard that orchestrates AI agents, manages messages/knocks, and provides a terminal subsystem. The stack is Next.js (App Router) + Payload CMS + Elysia API + custom WebSocket gateway.

## Repository layout

```
apps/dashboard/          Next.js app + Payload CMS + custom dev gateway (server.mjs)
packages/api/            Elysia API — HTTP + WS route definitions, Zod schemas, in-memory store
packages/client/         Eden Treaty client, CLI (cc-cli), MCP server (cc-mcp), vitest tests
scripts/                 Build, test, deploy, and utility scripts
docs/                    Architecture and deploy documentation
.github/workflows/       CI pipeline
```

## Key documentation

- **[Architecture](docs/ARCHITECTURE.md)** — runtime architecture, message pipeline, terminal subsystem, testing strategy, and the relationship between the Elysia API and the dashboard gateway.
- **[Deploy & Release](docs/deploy.md)** — branch strategy (`staging -> rc -> main`), infrastructure (Cloudflare Tunnel + launchd), database management, build/run commands, RC deploy process, and release checklist.
- **[Testing Strategy](docs/testing-strategy.md)** — unified testing contract: test types (unit/e2e/scenario/integration), smoke rules, execution modes, artifact conventions, and agent test priorities.

## Development

```bash
pnpm dev              # start dashboard on http://localhost:3222
pnpm build            # build packages + dashboard
pnpm test             # vitest + playwright e2e
pnpm test:e2e         # playwright only (dynamic ports)
pnpm dev:reset-db     # wipe local dev database
```

## Conventions

- **Language**: all code and comments in English.
- **Package manager**: pnpm with workspace protocol (`workspace:*`).
- **Build**: packages use tsup; dashboard uses Next.js. Always run `pnpm build:packages` before dashboard build or tests.
- **Tests**: unit tests in `packages/client/tests/`, E2E in `apps/dashboard/tests/`. Integration tests (`*.integration.ts`) require `OPENAI_API_KEY` and a running dev server.
- **API "single source of truth"**: route definitions live in `packages/api/src/index.ts` (`apiRoutes`). CLI, MCP, and `callApi` all derive from this registry.
- **Realtime**: WebSocket endpoints (`/ws/messages`, `/ws/terminal`, `/connect`) are handled by `apps/dashboard/server.mjs`, not the Elysia app.
- **Data directory**: controlled by `CC_DATA_DIR`. Defaults to `.cache/data/dashboard/` in dev. Tests create isolated dirs under `.cache/`.
- **Artifacts**: all build/test artifacts go under `.cache/` (gitignored).
