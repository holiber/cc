CommandCenter (workflow-viz) monorepo.

## Getting Started

### Dev

```bash
pnpm dev
```

By default the dashboard runs on `http://localhost:3222`.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
