import os from 'os';
import { z } from 'zod';
import type { RouteDefinition } from '@command-center/api';

export function autoDescriptor() {
    return {
        machine: os.hostname(),
        ip: '127.0.0.1',
        runtime: `node-${process.versions.node}`,
        via: 'cli',
    };
}

/**
 * Generic HTTP caller that executes any RouteDefinition from apiRoutes.
 * Replaces per-command Eden Treaty wiring in CLI and MCP.
 */
export async function callApi(
    baseUrl: string,
    route: RouteDefinition,
    args: Record<string, unknown>,
): Promise<unknown> {
    let path = route.path;

    // Substitute path params (:key -> args[key])
    if (route.pathParams) {
        for (const key of Object.keys(route.pathParams.shape)) {
            const val = args[key];
            if (val == null) throw new Error(`Missing path param: ${key}`);
            path = path.replace(`:${key}`, encodeURIComponent(String(val)));
        }
    }

    // Build URL: concatenate base + path (URL() resolution doesn't work with subpaths)
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = new URL(base + path);
    if (route.querySchema) {
        for (const key of Object.keys(route.querySchema.shape)) {
            const val = args[key];
            if (val != null) url.searchParams.set(key, String(val));
        }
    }

    const headers: Record<string, string> = {};

    // Auth: inject Bearer token from args.token
    if (route.auth && args.token) {
        headers['Authorization'] = `Bearer ${String(args.token)}`;
    }

    // Build body from bodySchema fields
    let body: string | undefined;
    if (route.bodySchema && route.method !== 'GET') {
        headers['content-type'] = 'application/json';
        const payload: Record<string, unknown> = {};
        for (const key of Object.keys(route.bodySchema.shape)) {
            if (route.autoFill?.[key] === 'descriptor') {
                payload[key] = autoDescriptor();
            } else if (args[key] !== undefined) {
                payload[key] = args[key];
            }
        }
        body = JSON.stringify(payload);
    }

    // Extra headers (e.g., x-forwarded-for for knock)
    if (args.ip) {
        headers['x-forwarded-for'] = String(args.ip);
    }

    const controller = new AbortController();
    const timeoutMs = parseInt(process.env.CC_FETCH_TIMEOUT_MS || '30000', 10);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
        res = await fetch(url.toString(), {
            method: route.method,
            headers,
            body,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    const text = await res.text();
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    if (!res.ok) {
        const errMsg = data && typeof data === 'object' && 'error' in data
            ? String((data as any).error)
            : `HTTP ${res.status}`;
        throw new Error(`${route.summary} failed: ${errMsg}`);
    }

    return data;
}

/**
 * Collects all user-facing params for a route (body + path + query + auth token).
 * Returns a flat Zod shape for CLI opts / MCP tool params.
 */
export function routeToParamShape(route: RouteDefinition): Record<string, z.ZodTypeAny> {
    const shape: Record<string, z.ZodTypeAny> = {};

    if (route.auth) {
        shape.token = z.string().describe(
            route.auth === 'admin' ? 'Admin Bearer token' : 'Bearer token',
        );
    }

    if (route.pathParams) {
        for (const [key, schema] of Object.entries(route.pathParams.shape)) {
            shape[key] = schema as z.ZodTypeAny;
        }
    }

    if (route.querySchema) {
        for (const [key, schema] of Object.entries(route.querySchema.shape)) {
            shape[key] = schema as z.ZodTypeAny;
        }
    }

    if (route.bodySchema) {
        const omit = new Set(route.omitFromCli ?? []);
        for (const [key, schema] of Object.entries(route.bodySchema.shape)) {
            if (omit.has(key)) continue;
            shape[key] = schema as z.ZodTypeAny;
        }
    }

    if (route.extraParams) {
        for (const [key, schema] of Object.entries(route.extraParams.shape)) {
            shape[key] = schema as z.ZodTypeAny;
        }
    }

    return shape;
}
