#!/usr/bin/env tsx
/**
 * CommandCenter CLI — fully auto-generated from apiRoutes.
 *
 * Adding a new API endpoint only requires editing app.ts + schemas.ts + index.ts.
 * CLI commands, options, and help text are all derived from the route registry.
 * The only manual command is `connect` (WebSocket REPL).
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Options } from 'yargs';
import { z } from 'zod';
import WebSocket from 'ws';

import { apiRoutes } from '@command-center/api';
import type { RouteDefinition } from '@command-center/api';
import { callApi, routeToParamShape } from './callApi';

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_URL = process.env.CC_API_URL || 'http://localhost:3222/api/v1';

// ─── Helpers ────────────────────────────────────────────────

function zodShapeToYargsOpts(shape: Record<string, z.ZodTypeAny>): Record<string, Options> {
    const opts: Record<string, Options> = {};
    for (const [key, raw] of Object.entries(shape)) {
        let field: z.ZodTypeAny = raw;
        let optional = false;

        if (field instanceof z.ZodOptional) {
            field = field.unwrap();
            optional = true;
        }

        let type: 'string' | 'number' | 'boolean' = 'string';
        if (field instanceof z.ZodNumber) type = 'number';
        if (field instanceof z.ZodBoolean) type = 'boolean';

        const choices =
            field instanceof z.ZodEnum ? (field as z.ZodEnum<any>).options : undefined;

        opts[key] = {
            type,
            demandOption: !optional,
            description: field.description,
            ...(choices ? { choices } : {}),
        };
    }
    return opts;
}

function output(data: unknown) {
    console.log(JSON.stringify(data, null, 2));
}

async function run(fn: () => Promise<unknown>) {
    try {
        output(await fn());
    } catch (e: any) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

// ─── Auto-register API commands ─────────────────────────────

function registerRoutes(cli: any): any {
    // Group routes by prefix for subcommand nesting (e.g., "admin.knocks" -> admin > knocks)
    const topLevel: string[] = [];
    const grouped = new Map<string, string[]>();

    for (const name of Object.keys(apiRoutes)) {
        if (name === 'connect') continue;
        const dot = name.indexOf('.');
        if (dot === -1) {
            topLevel.push(name);
        } else {
            const prefix = name.slice(0, dot);
            if (!grouped.has(prefix)) grouped.set(prefix, []);
            grouped.get(prefix)!.push(name);
        }
    }

    // Register top-level commands
    for (const name of topLevel) {
        const route = (apiRoutes as Record<string, RouteDefinition>)[name];
        const shape = routeToParamShape(route);
        const opts = zodShapeToYargsOpts(shape);

        cli = cli.command(
            name,
            route.summary,
            (y) => y.options(opts).epilog(route.description),
            (argv) => {
                run(() => callApi(argv.url as string, route, argv as Record<string, unknown>));
            },
        );
    }

    // Register grouped subcommands (e.g., admin knocks, admin approve)
    for (const [prefix, names] of grouped) {
        cli = cli.command(prefix, `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} commands`, (y) => {
            let sub = y;
            for (const fullName of names) {
                const subName = fullName.slice(prefix.length + 1);
                const route = (apiRoutes as Record<string, RouteDefinition>)[fullName];
                const shape = routeToParamShape(route);
                const opts = zodShapeToYargsOpts(shape);

                sub = sub.command(
                    subName,
                    route.summary,
                    (yy) => yy.options(opts).epilog(route.description),
                    (argv) => {
                        run(() => callApi(argv.url as string, route, argv as Record<string, unknown>));
                    },
                );
            }
            return sub.demandCommand(1).strict();
        });
    }

    return cli;
}

// ─── CLI ────────────────────────────────────────────────────

let cli = yargs(hideBin(process.argv))
    .scriptName('reporter')
    .option('url', {
        type: 'string',
        default: DEFAULT_URL,
        description: 'CommandCenter API base URL',
    });

cli = registerRoutes(cli);

// ── connect (manual — WebSocket REPL, not a REST call) ──────
cli = cli.command(
    'connect',
    apiRoutes.connect.summary,
    (y) => y.epilog(apiRoutes.connect.description),
    (argv) => {
        const baseUrl = argv.url as string;
        const wsUrl = baseUrl
            .replace(/^http:/, 'ws:')
            .replace(/^https:/, 'wss:')
            .replace(/\/api\/v1\/?$/, '/connect');

        console.log(`Connecting to ${wsUrl} …`);
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            console.log('Connected. Type commands (e.g. health, knock --name … ). Ctrl+C to quit.\n');
            process.stdin.setEncoding('utf8');
            process.stdin.resume();
            process.stdin.on('data', (chunk: string) => {
                const line = chunk.trim();
                if (!line) return;

                const parts = line.split(/\s+/);
                const method = parts[0];
                const args: Record<string, unknown> = {};
                for (let i = 1; i < parts.length - 1; i++) {
                    if (parts[i].startsWith('--')) {
                        const key = parts[i].slice(2);
                        const val = parts[i + 1];
                        args[key] = val;
                        i++;
                    }
                }

                ws.send(JSON.stringify({ method, args }));
            });
        });

        ws.on('message', (raw: Buffer | string) => {
            try {
                const msg = JSON.parse(raw.toString());
                console.log(JSON.stringify(msg, null, 2));
            } catch {
                console.log(raw.toString());
            }
        });

        ws.on('error', (err) => {
            console.error('WS error:', err.message);
            process.exit(1);
        });

        ws.on('close', () => {
            console.log('\nDisconnected.');
            process.exit(0);
        });

        process.on('SIGINT', () => {
            ws.close();
        });
    },
);

cli.demandCommand(1).strict().help().parse();
