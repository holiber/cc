import { Elysia } from 'elysia';
import apiApp from '@command-center/api/app';

// Create an Elysia instance that mounts the API app under the catch-all path.
// Next.js strips the route prefix, so we need to re-base the API.
const app = new Elysia({ prefix: '/api/v1' }).use(apiApp);

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
