import { EventEmitter } from 'events'

export type MessageEventType = 'message.created' | 'message.updated' | 'message.deleted'

export type MessageEventPayload = {
    type: MessageEventType
    doc: any
    timestamp: string
}

type Bus = {
    emit: (event: MessageEventPayload) => void
    on: (handler: (event: MessageEventPayload) => void) => () => void
}

const GLOBAL_KEY = '__CC_MESSAGE_BUS__'

function getGlobal(): any {
    return globalThis as any
}

export function getMessageBus(): Bus {
    const g = getGlobal()
    if (g[GLOBAL_KEY]) return g[GLOBAL_KEY] as Bus

    const emitter = new EventEmitter()
    emitter.setMaxListeners(1000)

    const bus: Bus = {
        emit: (event) => emitter.emit('event', event),
        on: (handler) => {
            emitter.on('event', handler)
            return () => emitter.off('event', handler)
        },
    }

    g[GLOBAL_KEY] = bus
    return bus
}

