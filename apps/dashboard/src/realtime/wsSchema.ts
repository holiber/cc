export function buildWsAsyncApiSchema() {
    return {
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
                variables: {
                    host: {
                        default: 'localhost:3222',
                    },
                },
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
                MessageCreated: {
                    name: 'message.created',
                    title: 'Message created',
                    payload: { $ref: '#/components/schemas/MessageEventEnvelope' },
                },
                MessageUpdated: {
                    name: 'message.updated',
                    title: 'Message updated',
                    payload: { $ref: '#/components/schemas/MessageEventEnvelope' },
                },
                MessageDeleted: {
                    name: 'message.deleted',
                    title: 'Message deleted',
                    payload: { $ref: '#/components/schemas/MessageEventEnvelope' },
                },
            },
            schemas: {
                MessageEventEnvelope: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['message.created', 'message.updated', 'message.deleted'],
                        },
                        ts: { type: 'string' },
                        data: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                doc: { type: 'object' },
                            },
                            required: ['doc'],
                        },
                    },
                    required: ['type', 'data'],
                },
            },
        },
    }
}

