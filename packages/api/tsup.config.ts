import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/app.ts',
        'src/schemas.ts',
        'src/store.ts',
    ],
    format: ['esm'],
    dts: true,
    splitting: true,
    clean: true,
    external: ['zod', 'elysia', /^@elysiajs\//],
});
