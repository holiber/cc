CommandCenter (workflow-viz) monorepo.

## Getting Started

### Dev

```bash
pnpm dev
```

By default the dashboard runs on `http://localhost:3222`.

The dev-mode database (Payload SQLite) is stored in `.cache/data/dashboard/cc.db` by default.

To wipe dev data and start fresh:

```bash
pnpm dev:reset-db
```

### Tests

Runs vitest + Playwright E2E:

```bash
pnpm test
```

Playwright E2E only (uses dynamic ports so it won’t collide with other projects):

```bash
pnpm test:e2e
```

### Playwright UI / traces

```bash
pnpm pw:ui
pnpm pw:trace
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Deploy & Release](docs/deploy.md)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

See [docs/deploy.md](docs/deploy.md) for the full branch strategy, release checklist, and launchd setup.
