# CommandCenter Architecture

This document describes the current architecture of the CommandCenter monorepo. It focuses on:

- The **dashboard runtime** (`Next.js` + `Payload`) and the custom dev gateway (`server.mjs`)
- The **terminal subsystem** ([JabTerm](https://github.com/holiber/jabterm))
- The **messages/knocks** domain, including realtime updates over WebSocket
- The **test harness** that keeps E2E deterministic on developer machines where ports may already be in use

## Repository layout (high level)

```
workflow-viz/
├── apps/
│   └── dashboard/                # Next.js app + Payload CMS + custom dev gateway
├── packages/
│   ├── api/                      # Elysia API (HTTP + WS methods)
│   └── client/                   # Eden Treaty client + CLI + vitest tests
├── scripts/
│   ├── assert-no-long-sleeps.mjs  # Guardrail for tests
│   ├── e2e.mjs                   # Playwright runner (dynamic ports + isolated cache/data)
│   ├── generate-ws-asyncapi.mjs   # Build-time WS schema generation into .cache/
│   ├── reset-dev-db.mjs          # Wipes local dev DB/media under .cache/
│   ├── show-trace.mjs            # Opens newest trace from cache
│   └── test.mjs                  # Unified runner (vitest + playwright)
└── .cache/                       # Gitignored runtime artifacts (Next, Playwright, data, schema)
```

## Runtime architecture

### Dashboard: Next.js + Payload CMS

- **Next.js app**: `apps/dashboard/` (App Router)
- **Payload Admin UI**: `/admin/*`
- **Payload REST API**: `/api/*` (e.g. `/api/users/me`, `/api/messages`)

Payload collections relevant to app features:

- **Messages**: `apps/dashboard/src/collections/Messages.ts`
  - Access control: admins can read admin-broadcast docs; users read docs addressed to them (`toUsers`).
  - Mentions: `@username` in `subject`/`text` is resolved to user ids and appended into `toUsers`.
  - Realtime: `afterChange`/`afterDelete` hooks emit events into the in-process message bus.

### Custom dev gateway (`apps/dashboard/server.mjs`)

The dashboard runs via a wrapper entrypoint in dev:

- **Entrypoint**: `apps/dashboard/server.mjs` (used by `pnpm dev`)
- **Responsibilities**:
  - Picks a usable dev port (warns & switches to an ephemeral port if busy).
  - Moves Next build output into `.cache/` via `NEXT_DIST_DIR` to avoid writing into `apps/dashboard/`.
  - Proxies `/api/v1/*` requests into the Elysia API via `app.fetch` (`@command-center/api/app`).
  - Hosts WebSocket upgrade routes:
    - `/connect` (Elysia-style method RPC channel)
    - `/ws/messages` (dashboard realtime feed)
    - `/ws/terminal` (same-origin bridge to local terminal server)
  - Forwards HMR upgrades to Next’s internal handler.

### Messages realtime pipeline (`/ws/messages`)

**Server-side**

- `apps/dashboard/src/realtime/messageBus.ts` is a singleton bus stored on `globalThis`.
- `apps/dashboard/src/collections/Messages.ts` emits:
  - `message.created`
  - `message.updated`
  - `message.deleted`
- `apps/dashboard/server.mjs` exposes `/ws/messages` and:
  - authenticates sockets by calling `/api/users/me` with the incoming cookie
  - filters emitted events based on `broadcastToAdmins`/`toUsers`
  - sends an initial meta envelope:
    - `meta.connected { userId, role }`

**Client-side**

- `apps/dashboard/src/realtime/messagesSocket.ts` maintains a single resilient WS connection to `/ws/messages`
- `apps/dashboard/src/realtime/messagesFeed.ts` provides a **shared client feed**:
  - 1 initial `GET /api/messages?...`
  - incremental updates from WS events
- `apps/dashboard/src/realtime/unreadState.ts` stores unread cursor in `localStorage` keyed by WS `userId`:
  - baseline is initialized on first connect
  - opening a message marks it read
  - “Mark as unread” is a **forced unread override by message id**

### Knocks → messages

Knock submission lives under API v1 (`/api/v1/knock`). For deterministic UX/tests, the gateway ensures
an admin-visible message exists immediately:

- When a knock is accepted by the API, `server.mjs` calls the internal dashboard route:
  - `POST /api/internal/knock-message`

Knock approval/rejection are handled by dashboard routes (`/api/knocks/:id/approve|reject`) which
update the corresponding message’s event status.

### WebSocket schema (“self-describing WS API”)

- **Runtime endpoint** (source of truth):
  - `GET /api/ws/schema` → `apps/dashboard/src/app/(app)/api/ws/schema/route.ts`
  - returns an **AsyncAPI 2.6.0** JSON document for `/ws/messages`
- **Build-time artifact**:
  - `scripts/generate-ws-asyncapi.mjs` writes `.cache/asyncapi/ws-schema.json`

## Terminal subsystem

Terminal functionality is provided by [JabTerm](https://github.com/holiber/jabterm) — a standalone library extracted from this project.

- **Server**: `jabterm/server` — Node.js WebSocket server powered by `node-pty`
- **React component**: `jabterm/react` — drop-in `<JabTerm>` component
- **Proxy**: `createTerminalProxy()` from `jabterm/server` bridges browser WS to local terminal server (used in `server.mjs` for HTTPS/Cloudflare setups)

### Integration in this project

- `apps/dashboard/src/components/terminal/TerminalManager.tsx` — tab management (app-specific), uses `<JabTerm>` from `jabterm/react`
- `apps/dashboard/src/lib/terminalWsUrl.ts` — WS URL resolution (env vars, proxy/direct mode)
- `apps/dashboard/server.mjs` — wires `createTerminalProxy()` for `/ws/terminal` upgrade path
- Playwright config starts `jabterm-server` as a `webServer` for E2E tests

For architecture details, protocol docs, and diagrams, see the [JabTerm ARCHITECTURE.md](https://github.com/holiber/jabterm/blob/main/docs/ARCHITECTURE.md).

## Testing architecture

### Determinism strategy

1. **Dynamic ports for E2E**
   - `scripts/e2e.mjs` allocates free high ports and exports:
     - `PORT` / `BASE_URL` (Next dev server)
     - `NEXT_PUBLIC_TERMINAL_WS_PORT` / `TERMINAL_WS_URL` (terminal WS server)
2. **Isolated test data dir**
   - `CC_DATA_DIR` is created under `.cache/cc-test-<timestamp>/` *before* Playwright starts `webServer`.
3. **All artifacts under `.cache/`**
   - `NEXT_DIST_DIR=../../.cache/next-e2e`
   - Playwright outputs: `.cache/playwright/{test-results,report,auth}/`
4. **Guardrail: no long sleeps**
   - `scripts/assert-no-long-sleeps.mjs` enforces a max sleep window in test code.
5. **No parallel workers**
   - `apps/dashboard/playwright.config.ts` defaults to `workers: 1` to avoid conflicts with open ports/PTYs.

### Terminal tests (why UI screenshots are limited)

Protocol-level terminal tests (`ws` client) don’t create a browser `page`, so Playwright UI won’t show DOM
screenshots. The UI-side checks are intentionally smoke-level.

## Useful commands

```bash
# full suite
pnpm test

# dashboard e2e only (dynamic ports)
pnpm -F @command-center/dashboard test

# playwright UI (loads artifacts under .cache/playwright/)
pnpm pw:ui

# open newest trace
pnpm pw:trace

# reset local dev db/media (under .cache/data/dashboard)
pnpm dev:reset-db
```

## Deployment notes (common pitfalls)

- **Production should not run `next dev`**. Use `next build` + `next start` with `NODE_ENV=production`.
- If the admin page renders blank with `ChunkLoadError` and browser logs `ERR_QUIC_PROTOCOL_ERROR`,
  and you are behind Cloudflare, consider disabling **HTTP/3 (QUIC)** for the zone.
