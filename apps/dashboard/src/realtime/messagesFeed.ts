import { subscribeMessagesSocket, type WsMessageEvent } from './messagesSocket'
import { ensureUnreadBaseline } from './unreadState'

type FeedState = {
    ready: boolean
    userId: string | null
    role: string | null
    docs: any[]
}

type Listener = (state: FeedState) => void

const MAX_DOCS = 200

let state: FeedState = {
    ready: false,
    userId: null,
    role: null,
    docs: [],
}

let listeners = new Set<Listener>()
let unsubWs: null | (() => void) = null
let inflightInit: Promise<void> | null = null

function notify() {
    for (const l of listeners) l(state)
}

function setState(patch: Partial<FeedState>) {
    state = { ...state, ...patch }
    notify()
}

function upsertDoc(doc: any) {
    const id = doc?.id ? String(doc.id) : ''
    if (!id) return
    const next = [doc, ...state.docs.filter((d) => String(d?.id ?? '') !== id)]
    next.sort((a, b) => String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? '')))
    setState({ docs: next.slice(0, MAX_DOCS) })
}

function deleteDoc(doc: any) {
    const id = doc?.id ? String(doc.id) : ''
    if (!id) return
    setState({ docs: state.docs.filter((d) => String(d?.id ?? '') !== id) })
}

async function fetchInitialMessages() {
    const params = new URLSearchParams()
    params.set('limit', String(MAX_DOCS))
    params.set('sort', '-createdAt')
    params.set('depth', '1')
    const res = await fetch(`/api/messages?${params.toString()}`, { credentials: 'include' })
    if (!res.ok) {
        setState({ ready: true, docs: [] })
        return
    }
    const json: any = await res.json().catch(() => null)
    const docs: any[] = Array.isArray(json?.docs) ? json.docs : []
    setState({ ready: true, docs: docs.slice(0, MAX_DOCS) })
}

async function ensureStarted() {
    if (unsubWs) return
    unsubWs = subscribeMessagesSocket((evt: WsMessageEvent) => {
        if (evt.type === 'meta.connected') {
            const userId = String((evt as any)?.data?.userId ?? '')
            const role = String((evt as any)?.data?.role ?? '')
            setState({ userId: userId || null, role: role || null })
            if (userId) ensureUnreadBaseline(userId)
            if (!inflightInit) {
                inflightInit = fetchInitialMessages().finally(() => { inflightInit = null })
            }
            return
        }

        if (evt.type === 'message.created' || evt.type === 'message.updated') {
            const doc = (evt as any)?.data?.doc
            if (doc) upsertDoc(doc)
            return
        }
        if (evt.type === 'message.deleted') {
            const doc = (evt as any)?.data?.doc
            if (doc) deleteDoc(doc)
        }
    })

    // If WS meta never arrives (e.g. auth), still avoid hanging UI forever.
    if (!inflightInit) {
        inflightInit = fetchInitialMessages().finally(() => { inflightInit = null })
    }
}

export function subscribeMessagesFeed(listener: Listener): () => void {
    listeners.add(listener)
    void ensureStarted()
    listener(state)

    return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
            unsubWs?.()
            unsubWs = null
            inflightInit = null
            state = { ready: false, userId: null, role: null, docs: [] }
        }
    }
}

export async function refreshMessagesFeed() {
    await fetchInitialMessages()
}

