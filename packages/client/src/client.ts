import { treaty } from '@elysiajs/eden';
import type { AppType } from '@command-center/api';

/**
 * client — thin Eden Treaty client for the CommandCenter API.
 *
 * All types are derived directly from AppType (Elysia server definition).
 * There are no manual method wrappers here — this IS the API surface.
 *
 * Usage:
 *   const client = createClient('http://localhost:3222/api/v1');
 *   const { data } = await client.health.get();
 *   const { data } = await client.knock.post({ name, role, intent, descriptor, secret });
 *   const { data } = await client.admin.knocks.get({ headers: { Authorization: `Bearer ${token}` } });
 */
export type Client = ReturnType<typeof treaty<AppType>>;

export const createClient = (url: string): Client => treaty<AppType>(url);

