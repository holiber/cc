# CommandCenter Architecture

This document describes the current architecture of the CommandCenter monorepo, with a focus on the **terminal subsystem** and the changes that were made to keep tests deterministic on developer machines where ports may already be in use.

## Repository layout (high level)

```
workflow-viz/
├── apps/
│   └── dashboard/           # Next.js app + Payload CMS
├── packages/
│   ├── api/                 # API package
│   └── client/              # Client library + vitest tests
├── scripts/
│   ├── e2e.mjs              # Playwright runner (dynamic ports)
│   ├── show-trace.mjs       # Opens newest trace from cache
│   ├── terminal-server.mjs  # Terminal WebSocket server (node-pty)
│   └── test.mjs             # Unified runner (vitest + playwright)
└── .cache/                  # Gitignored runtime artifacts
```

## Terminal subsystem

### Terminal WebSocket server

- **Entrypoint**: `scripts/terminal-server.mjs`
- **Transport**: WebSocket (`ws`)
- **PTY**: `node-pty` spawns `/bin/zsh` (macOS)
- **Control messages**: JSON text frames, currently only `{ "type": "resize", "cols": number, "rows": number }`
- **Input frames**: binary frames written to PTY stdin

### Browser terminal UI

- `apps/dashboard/src/components/terminal/XtermView.tsx` renders xterm and connects a WebSocket.
- `apps/dashboard/src/components/terminal/TerminalManager.tsx` constructs the WS URL.
  - **Important**: the UI now connects **directly** to `NEXT_PUBLIC_TERMINAL_WS_PORT` instead of going through a Next.js WS proxy. This was the biggest stability win.

## Testing architecture

### Why terminal tests were flaky

- In Next dev + React Strict Mode, effects can mount/unmount twice, which caused the terminal UI to print `Connection closed` during normal lifecycle churn.
- Fixed ports (`3222`/`3223`) were fragile on a dev Mac where other projects may already be listening.
- Terminal UI echo tests were inherently flaky because the WS can reconnect during page reloads/hydration and close with code `1006` even when the underlying PTY server is fine.

### Strategy that made it deterministic

1. **Dynamic ports for E2E**  
   `scripts/e2e.mjs` selects free high ports (49152–65535) and exports:
   - `PORT` / `BASE_URL` for Next dev server
   - `NEXT_PUBLIC_TERMINAL_WS_PORT` / `TERMINAL_WS_URL` for the terminal WS server

2. **All artifacts go into gitignored cache**  
   - Next E2E build output: `.cache/next-e2e-<PORT>/` via `NEXT_DIST_DIR`
   - Playwright outputs: `.cache/playwright/{test-results,report,auth}/`
   - Payload dev DB/media default: `.cache/data/dashboard/`

3. **Protocol tests are authoritative for echo/zombie checks**  
   - `apps/dashboard/tests/terminal-echo.spec.ts` uses a `ws` client to assert echo round-trip.
   - `apps/dashboard/tests/terminal-zombie.spec.ts` asserts PTY processes are killed on WS close.

4. **Avoid timing sleeps**  
   Terminal specs use `waitForMatch(...)` instead of fixed `setTimeout` windows.

5. **Reduce PTY parallelism**  
   Terminal specs are configured serially to avoid `node-pty` flakiness under parallel workers.

### Why you won’t see screenshots for most terminal tests in Playwright UI

The protocol-level terminal tests don’t create a browser `page`, so there are no DOM snapshots or screenshots to show. The UI-side test is intentionally a **smoke check** (xterm mounts) rather than the source of truth for terminal correctness.

## Useful commands

- Playwright UI:

```bash
pnpm pw:ui
```

- Open newest trace:

```bash
pnpm pw:trace
```

- Terminal tests only:

```bash
pnpm test:e2e -- --grep terminal
```
