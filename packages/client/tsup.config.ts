import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts', 'src/callApi.ts'],
        format: ['esm'],
        dts: true,
        splitting: true,
        clean: true,
        noExternal: ['@command-center/api'],
    },
    {
        entry: ['src/cli.ts', 'src/mcp.ts'],
        format: ['esm'],
        dts: false,
        splitting: false,
        noExternal: ['@command-center/api'],
        banner: { js: '#!/usr/bin/env node' },
    },
]);
