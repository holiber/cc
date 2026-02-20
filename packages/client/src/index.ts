/**
 * @command-center/client
 *
 * Client tools for communicating with the CommandCenter server.
 * - client:   typed Eden Treaty client (types derived from AppType, zero duplication)
 * - cli:      schema-driven yargs CLI (options from Zod, help from apiMeta)
 */

export { createClient } from './client';
export type { Client } from './client';
