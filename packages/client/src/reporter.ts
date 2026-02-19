import { treaty } from '@elysiajs/eden';
import type { AppType } from '@command-center/api';

/**
 * reporter — thin Eden Treaty client for the CommandCenter API.
 *
 * All types are derived directly from AppType (Elysia server definition).
 * There are no manual method wrappers here — this IS the API surface.
 *
 * Usage:
 *   const reporter = createReporter('http://localhost:3222/api/v1');
 *   const { data } = await reporter.health.get();
 *   const { data } = await reporter.knock.post({ name, role, intent, descriptor, secret });
 *   const { data } = await reporter.admin.knocks.get({ headers: { Authorization: `Bearer ${token}` } });
 */
export type Reporter = ReturnType<typeof treaty<AppType>>;

export const createReporter = (url: string): Reporter => treaty<AppType>(url);
