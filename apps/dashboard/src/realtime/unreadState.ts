type UnreadState = {
    lastReadAtMs: number
    forcedUnreadIds: string[]
}

const VERSION = 1
const KEY_PREFIX = `cc:unread:v${VERSION}:`
const EVENT_NAME = 'cc:unread-changed'

function key(userId: string) {
    return `${KEY_PREFIX}${userId}`
}

function safeParse(raw: string | null): UnreadState | null {
    if (!raw) return null
    try {
        const j = JSON.parse(raw)
        if (!j || typeof j !== 'object') return null
        const lastReadAtMs = Number((j as any).lastReadAtMs)
        const forcedUnreadIds = Array.isArray((j as any).forcedUnreadIds) ? (j as any).forcedUnreadIds : []
        return {
            lastReadAtMs: Number.isFinite(lastReadAtMs) ? lastReadAtMs : 0,
            forcedUnreadIds: forcedUnreadIds.filter((x: any) => typeof x === 'string'),
        }
    } catch {
        return null
    }
}

function emit() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function subscribeUnreadChanges(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {}
    const handler = () => cb()
    window.addEventListener(EVENT_NAME, handler as any)
    return () => window.removeEventListener(EVENT_NAME, handler as any)
}

export function getUnreadState(userId: string): { lastReadAtMs: number; forcedUnreadIds: Set<string> } {
    if (typeof window === 'undefined') return { lastReadAtMs: 0, forcedUnreadIds: new Set() }
    const st = safeParse(window.localStorage.getItem(key(userId)))
    return {
        lastReadAtMs: st?.lastReadAtMs ?? 0,
        forcedUnreadIds: new Set(st?.forcedUnreadIds ?? []),
    }
}

export function ensureUnreadBaseline(userId: string) {
    if (typeof window === 'undefined') return
    const k = key(userId)
    const existing = safeParse(window.localStorage.getItem(k))
    if (existing) return
    const init: UnreadState = { lastReadAtMs: Date.now(), forcedUnreadIds: [] }
    window.localStorage.setItem(k, JSON.stringify(init))
    emit()
}

export function markReadUpTo(userId: string, timestampMs: number, messageId?: string) {
    if (typeof window === 'undefined') return
    const k = key(userId)
    const st = safeParse(window.localStorage.getItem(k)) ?? { lastReadAtMs: 0, forcedUnreadIds: [] }
    const next: UnreadState = {
        lastReadAtMs: Math.max(st.lastReadAtMs ?? 0, timestampMs),
        forcedUnreadIds: (st.forcedUnreadIds ?? []).filter((id) => id !== messageId),
    }
    window.localStorage.setItem(k, JSON.stringify(next))
    emit()
}

export function markAsUnread(userId: string, messageId: string) {
    if (typeof window === 'undefined') return
    const k = key(userId)
    const st = safeParse(window.localStorage.getItem(k)) ?? { lastReadAtMs: Date.now(), forcedUnreadIds: [] }
    const set = new Set<string>(st.forcedUnreadIds ?? [])
    set.add(messageId)
    const next: UnreadState = {
        lastReadAtMs: st.lastReadAtMs ?? Date.now(),
        forcedUnreadIds: Array.from(set),
    }
    window.localStorage.setItem(k, JSON.stringify(next))
    emit()
}

export function clearUnreadStorageForTests() {
    if (typeof window === 'undefined') return
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i)
        if (k && k.startsWith(KEY_PREFIX)) window.localStorage.removeItem(k)
    }
    emit()
}

