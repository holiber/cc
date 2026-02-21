export type WsMessageEvent =
    | { type: 'message.created' | 'message.updated' | 'message.deleted'; data: { doc: any }; ts?: string }
    | { type: 'meta.connected'; data?: any }

type Listener = (evt: WsMessageEvent) => void

let ws: WebSocket | null = null
let listeners: Set<Listener> = new Set()
let reconnectTimer: number | null = null
let reconnectAttempt = 0

function getWsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws/messages`
}

function ensureConnected() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
    }

    ws = new WebSocket(getWsUrl())

    ws.onopen = () => {
        reconnectAttempt = 0
    }

    ws.onmessage = (ev) => {
        try {
            const msg = JSON.parse(String(ev.data)) as WsMessageEvent
            for (const l of listeners) l(msg)
        } catch {
            // ignore
        }
    }

    ws.onclose = () => scheduleReconnect()
    ws.onerror = () => scheduleReconnect()
}

function scheduleReconnect() {
    if (reconnectTimer) return
    if (listeners.size === 0) return

    const delay = Math.min(10_000, 250 * Math.pow(2, reconnectAttempt++))
    reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null
        ensureConnected()
    }, delay)
}

export function subscribeMessagesSocket(listener: Listener): () => void {
    listeners.add(listener)
    ensureConnected()

    return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer)
                reconnectTimer = null
            }
            try { ws?.close() } catch { /* ignore */ }
            ws = null
        }
    }
}

