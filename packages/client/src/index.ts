/**
 * @command-center/client
 *
 * Client tools for communicating with the CommandCenter server.
 * - reporter: typed Eden Treaty client (types derived from AppType, zero duplication)
 * - cli:      schema-driven yargs CLI (options from Zod, help from apiMeta)
 */

export { createReporter } from './reporter';
export type { Reporter } from './reporter';
