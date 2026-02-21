import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(repoRoot, '.cache', 'asyncapi');
const outFile = path.resolve(outDir, 'ws-schema.json');

// Keep this generator dependency-free and deterministic.
// The runtime endpoint (/api/ws/schema) is the source of truth.
const schema = {
  asyncapi: '2.6.0',
  info: {
    title: 'CommandCenter WebSocket API',
    version: '0.1.0',
    description: 'WebSocket channels used by the dashboard for realtime updates.',
  },
  servers: {
    default: {
      url: 'ws://{host}',
      protocol: 'ws',
      variables: { host: { default: 'localhost:3222' } },
    },
  },
  channels: {
    '/ws/messages': {
      description: 'Realtime message events visible to the authenticated user.',
      subscribe: {
        message: {
          oneOf: [
            { $ref: '#/components/messages/MessageCreated' },
            { $ref: '#/components/messages/MessageUpdated' },
            { $ref: '#/components/messages/MessageDeleted' },
          ],
        },
      },
    },
  },
  components: {
    messages: {
      MessageCreated: { name: 'message.created', payload: { $ref: '#/components/schemas/MessageEventEnvelope' } },
      MessageUpdated: { name: 'message.updated', payload: { $ref: '#/components/schemas/MessageEventEnvelope' } },
      MessageDeleted: { name: 'message.deleted', payload: { $ref: '#/components/schemas/MessageEventEnvelope' } },
    },
    schemas: {
      MessageEventEnvelope: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['message.created', 'message.updated', 'message.deleted'] },
          ts: { type: 'string' },
          data: {
            type: 'object',
            additionalProperties: false,
            properties: { doc: { type: 'object' } },
            required: ['doc'],
          },
        },
        required: ['type', 'data'],
      },
    },
  },
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(schema, null, 2));
console.log(`[asyncapi] wrote ${outFile}`);

