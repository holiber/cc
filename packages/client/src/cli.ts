#!/usr/bin/env tsx
/**
 * CommandCenter CLI — auto-generated from the API's Zod schemas and apiMeta.
 *
 * NO command descriptions or argument definitions live here.
 * - Help text  → imported from apiMeta  (@command-center/api)
 * - Arg types  → derived from Zod schemas (@command-center/api)
 * - API calls  → delegated to Eden Treaty via reporter
 *
 * Adding a new API endpoint only requires editing app.ts + schemas.ts.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Options } from 'yargs';
import { z } from 'zod';
import WebSocket from 'ws';
import os from 'os';

import {
    apiMeta,
    KnockRequestSchema,
    DescriptorSchema,
} from '@command-center/api';
import { createReporter } from './reporter';

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_URL = process.env.CC_API_URL || 'http://localhost:3222/api/v1';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Walk a ZodObject shape and emit yargs Options for each field.
 * Skips fields listed in `omit` (e.g. auto-filled ones like descriptor).
 */
function schemaToOpts(
    schema: z.ZodObject<any>,
    omit: string[] = [],
): Record<string, Options> {
    const opts: Record<string, Options> = {};
    for (const [key, raw] of Object.entries(schema.shape)) {
        if (omit.includes(key)) continue;
        // Unwrap optional
        const field = raw instanceof z.ZodOptional ? raw.unwrap() : raw;
        const optional = raw instanceof z.ZodOptional;

        let type: 'string' | 'number' | 'boolean' = 'string';
        if (field instanceof z.ZodNumber) type = 'number';
        if (field instanceof z.ZodBoolean) type = 'boolean';

        // ZodEnum → list choices
        const choices =
            field instanceof z.ZodEnum ? (field as z.ZodEnum<any>).options : undefined;

        opts[key] = {
            type,
            demandOption: !optional,
            description: (field as any).description,
            ...(choices ? { choices } : {}),
        };
    }
    return opts;
}

function autoDescriptor(): z.infer<typeof DescriptorSchema> {
    return {
        machine: os.hostname(),
        ip: '127.0.0.1',
        runtime: `node-${process.versions.node}`,
        via: 'cli',
    };
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

// ─── Zod schemas for CLI commands ──────────────────────────
// We omit 'descriptor' from knock — it's auto-filled from the local env.
const knockOpts = schemaToOpts(KnockRequestSchema, ['descriptor']);

// ─── CLI ────────────────────────────────────────────────────

yargs(hideBin(process.argv))
    .scriptName('reporter')
    .option('url', {
        type: 'string',
        default: DEFAULT_URL,
        description: 'CommandCenter API base URL',
    })

    // ── health ───────────────────────────────────────────
    .command(
        'health',
        apiMeta.health.summary,
        { describe: { hidden: true, type: 'string', default: apiMeta.health.description } },
        (argv) => {
            const r = createReporter(argv.url as string);
            run(async () => {
                const { data, error, status } = await r.health.get();
                if (error) throw new Error(`Health check failed: ${status}`);
                return data;
            });
        },
    )

    // ── knock ────────────────────────────────────────────
    .command(
        'knock',
        apiMeta.knock.summary,
        (y) => y
            .options(knockOpts)
            .option('ip', {
                type: 'string',
                description: 'Set x-forwarded-for (helps avoid rate-limit collisions in tests)',
            })
            .epilog(apiMeta.knock.description),
        (argv) => {
            const r = createReporter(argv.url as string);
            run(async () => {
                const { data, error, status } = await r.knock.post({
                    name: argv.name as string,
                    role: argv.role as any,
                    intent: argv.intent as string,
                    secret: argv.secret as string,
                    descriptor: autoDescriptor(),
                }, argv.ip ? { headers: { 'x-forwarded-for': String(argv.ip) } } : undefined);
                if (error) throw new Error((error as any)?.value?.error ?? `Knock failed: ${status}`);
                return data;
            });
        },
    )

    // ── claim ────────────────────────────────────────────
    .command(
        'claim',
        apiMeta.claim.summary,
        (y) =>
            y
                .option('request-id', { type: 'string', demandOption: true, description: 'Knock request ID' })
                .option('secret', { type: 'string', demandOption: true, description: 'Secret used during knock' })
                .epilog(apiMeta.claim.description),
        (argv) => {
            const r = createReporter(argv.url as string);
            run(async () => {
                const { data, error, status } = await (r.knock as any)(
                    { id: argv['request-id'] as string },
                ).claim.post({ secret: argv.secret as string });
                if (error) throw new Error((error as any)?.value?.error ?? `Claim failed: ${status}`);
                return data;
            });
        },
    )

    // ── admin ────────────────────────────────────────────
    .command('admin', 'Admin commands', (y) =>
        y
            // admin knocks
            .command(
                'knocks',
                apiMeta['admin.knocks'].summary,
                (yy) =>
                    yy
                        .option('token', { type: 'string', demandOption: true, description: 'Admin Bearer token' })
                        .option('status', { type: 'string', description: 'Filter by status (pending|approved|claimed|expired|rejected)' })
                        .epilog(apiMeta['admin.knocks'].description),
                (argv) => {
                    const r = createReporter(argv.url as string);
                    run(async () => {
                        const { data, error, status } = await r.admin.knocks.get({
                            query: { status: argv.status as string | undefined },
                            headers: { Authorization: `Bearer ${argv.token}` },
                        });
                        if (error) throw new Error((error as any)?.value?.error ?? `List failed: ${status}`);
                        return data;
                    });
                },
            )

            // admin approve
            .command(
                'approve',
                apiMeta['admin.approve'].summary,
                (yy) =>
                    yy
                        .option('token', { type: 'string', demandOption: true, description: 'Admin Bearer token' })
                        .option('id', { type: 'string', demandOption: true, description: 'Knock request ID to approve' })
                        .epilog(apiMeta['admin.approve'].description),
                (argv) => {
                    const r = createReporter(argv.url as string);
                    run(async () => {
                        const { data, error, status } = await (r.admin.knocks as any)(
                            { id: argv.id as string },
                        ).approve.post({}, { headers: { Authorization: `Bearer ${argv.token}` } });
                        if (error) throw new Error((error as any)?.value?.error ?? `Approve failed: ${status}`);
                        return data;
                    });
                },
            )

            // admin reject
            .command(
                'reject',
                apiMeta['admin.reject'].summary,
                (yy) =>
                    yy
                        .option('token', { type: 'string', demandOption: true, description: 'Admin Bearer token' })
                        .option('id', { type: 'string', demandOption: true, description: 'Knock request ID to reject' })
                        .epilog(apiMeta['admin.reject'].description),
                (argv) => {
                    const r = createReporter(argv.url as string);
                    run(async () => {
                        const { data, error, status } = await (r.admin.knocks as any)(
                            { id: argv.id as string },
                        ).reject.post({}, { headers: { Authorization: `Bearer ${argv.token}` } });
                        if (error) throw new Error((error as any)?.value?.error ?? `Reject failed: ${status}`);
                        return data;
                    });
                },
            )

            .demandCommand(1)
            .strict(),
    )

    // ── connect ──────────────────────────────────────────
    /**
     * Opens a persistent WebSocket to /connect and starts an interactive REPL.
     *
     * Send commands as: method [--key value ...]
     * Examples:
     *   health
     *   knock --name alex --role agent --intent "review code" --secret s3cr3t
     *   admin.approve --token tok_xxx --id knock_yyy
     *   admin.reject --token tok_xxx --id knock_yyy
     *
     * Ctrl+C to disconnect.
     */
    .command(
        'connect',
        apiMeta.connect.summary,
        (y) => y.epilog(apiMeta.connect.description),
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

                    // Parse "method --key value --key2 value2" into JSON message
                    const parts = line.split(/\s+/);
                    const method = parts[0];
                    const args: Record<string, unknown> = {};
                    for (let i = 1; i < parts.length - 1; i++) {
                        if (parts[i].startsWith('--')) {
                            const key = parts[i].slice(2);
                            const val = parts[i + 1];
                            args[key] = val;
                            i++; // skip value
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
    )

    .demandCommand(1)
    .strict()
    .help()
    .parse();
