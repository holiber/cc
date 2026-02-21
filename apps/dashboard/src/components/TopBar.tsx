"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiMenu, FiMail, FiTerminal, FiX, FiHome,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import BurgerMenu from "@/components/BurgerMenu";
import Footer from "@/components/Footer";
import TerminalManager from "@/components/terminal/TerminalManager";
import { NAV_ITEMS } from "@/components/navConfig";
import { subscribeMessagesFeed } from "@/realtime/messagesFeed";
import { getUnreadState, subscribeUnreadChanges } from "@/realtime/unreadState";

const SIDEBAR_WIDTH = 224; // w-56 = 14rem = 224px
const DEFAULT_OPENCODE_WIDTH = 440;
const MIN_OPENCODE_WIDTH = 300;
const MAX_OPENCODE_WIDTH = 800;
const DEFAULT_TERMINAL_HEIGHT = 260;
const MIN_TERMINAL_HEIGHT = 100;
const MAX_TERMINAL_HEIGHT = 600;

// ─── Page metadata (icon + title) by route ──────────────────
interface PageMeta { icon: IconType; title: string; description: string }

// Derive from the single navConfig source — no duplication
const PAGE_META: Record<string, PageMeta> = Object.fromEntries(
    NAV_ITEMS.map(({ href, label, icon, description }) => [href, { icon, title: label, description }])
);

const EXPERIMENTS_META: PageMeta = PAGE_META["/experiments/main"] ?? { icon: FiHome, title: "Experiments", description: "" };
const FALLBACK_META: PageMeta = { icon: FiHome, title: "Home", description: "" };

function getPageMeta(pathname: string): PageMeta {
    if (PAGE_META[pathname]) return PAGE_META[pathname];
    if (pathname.startsWith("/experiments")) return EXPERIMENTS_META;
    return FALLBACK_META;
}

type NotificationToast = {
    id: string;
    subject: string;
    fromName: string;
    createdAt: string;
};

export default function TopBar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [opencodeOpen, setOpencodeOpen] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(() => pathname === '/messages');
    const [opencodeWidth, setOpencodeWidth] = useState(DEFAULT_OPENCODE_WIDTH);
    const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
    const pageMeta = getPageMeta(pathname);
    const PageIcon = pageMeta.icon;

    const toggleTerminal = useCallback(() => setIsTerminalOpen(v => !v), []);

    const mailRef = useRef<HTMLDivElement | null>(null);
    const [mailAnchor, setMailAnchor] = useState<{ top: number; right: number } | null>(null);

    const [notificationToasts, setNotificationToasts] = useState<NotificationToast[]>([]);
    const seenNotificationsRef = useRef<Set<string>>(new Set());
    const toastTimersRef = useRef<Map<string, number>>(new Map());

    const [feed, setFeed] = useState<{ ready: boolean; userId: string | null; docs: any[] }>({ ready: false, userId: null, docs: [] });
    const [unreadTick, setUnreadTick] = useState(0);

    const unread = useMemo(() => {
        const userId = feed.userId;
        if (!userId) return 0;
        const { lastReadAtMs, forcedUnreadIds } = getUnreadState(userId);
        const last = lastReadAtMs || 0;
        let n = 0;
        for (const d of feed.docs) {
            const id = d?.id ? String(d.id) : "";
            const createdAtMs = typeof d?.createdAt === "string" ? new Date(d.createdAt).getTime() : 0;
            if ((createdAtMs > last) || (id && forcedUnreadIds.has(id))) n++;
        }
        return n;
    }, [feed.docs, feed.userId, unreadTick]);

    const toastStyle = useMemo(() => ({
        position: "fixed" as const,
        top: mailAnchor?.top ?? 56,
        right: mailAnchor?.right ?? 12,
        zIndex: 120,
    }), [mailAnchor]);

    useEffect(() => {
        function updateAnchor() {
            const el = mailRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setMailAnchor({
                top: Math.round(rect.bottom + 8),
                right: Math.round(window.innerWidth - rect.right),
            });
        }
        updateAnchor();
        window.addEventListener("resize", updateAnchor);
        window.addEventListener("scroll", updateAnchor, true);
        return () => {
            window.removeEventListener("resize", updateAnchor);
            window.removeEventListener("scroll", updateAnchor, true);
        };
    }, []);

    const dismissToast = useCallback((id: string) => {
        setNotificationToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = toastTimersRef.current.get(id);
        if (timer) {
            window.clearTimeout(timer);
            toastTimersRef.current.delete(id);
        }
    }, []);

    useEffect(() => {
        const unsubFeed = subscribeMessagesFeed((s) => {
            setFeed({ ready: s.ready, userId: s.userId, docs: s.docs });
        });
        const unsubUnread = subscribeUnreadChanges(() => setUnreadTick((v) => v + 1));
        return () => {
            unsubFeed();
            unsubUnread();
            for (const t of toastTimersRef.current.values()) window.clearTimeout(t);
            toastTimersRef.current.clear();
        };
    }, [dismissToast]);

    // Toasts: show a few most recent unread messages (primed by initial fetch + WS).
    useEffect(() => {
        const userId = feed.userId;
        if (!userId) return;
        const { lastReadAtMs, forcedUnreadIds } = getUnreadState(userId);
        const last = lastReadAtMs || 0;
        const unreadDocs = feed.docs
            .map((d) => {
                const id = d?.id ? String(d.id) : "";
                const createdAt = String(d?.createdAt ?? "");
                const createdAtMs = createdAt ? new Date(createdAt).getTime() : 0;
                const isUnread = (createdAtMs > last) || (id && forcedUnreadIds.has(id));
                if (!isUnread || !id) return null;
                return {
                    id,
                    subject: String(d?.subject ?? "Message"),
                    fromName: String(d?.fromName ?? "Unknown"),
                    createdAt,
                } satisfies NotificationToast;
            })
            .filter(Boolean) as NotificationToast[];

        for (const t of unreadDocs.slice(0, 3)) {
            if (seenNotificationsRef.current.has(t.id)) continue;
            seenNotificationsRef.current.add(t.id);
            setNotificationToasts((prev) => [t, ...prev].slice(0, 3));
            const timer = window.setTimeout(() => dismissToast(t.id), 20_000);
            toastTimersRef.current.set(t.id, timer);
        }
    }, [dismissToast, feed.docs, feed.userId, unreadTick]);

    // If another part of the app approves/rejects a knock, update badge/toasts immediately
    // without relying on polling (useful in E2E where polling is disabled).
    useEffect(() => {
        function onKnockAction(e: Event) {
            const detail = (e as CustomEvent<any>)?.detail;
            const knockId = typeof detail?.knockId === "string" ? detail.knockId : "";
            if (!knockId) return;
            // No special pending-knock state; keep for backward compatibility (dismiss any toast by id if present).
            dismissToast(knockId);
        }
        window.addEventListener("cc:knock-action", onKnockAction as any);
        return () => window.removeEventListener("cc:knock-action", onKnockAction as any);
    }, [dismissToast]);

    // — OpenCode resize —
    const startOpencodeResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = opencodeWidth;
        const onMove = (ev: MouseEvent) => {
            const delta = startX - ev.clientX;
            setOpencodeWidth(Math.max(MIN_OPENCODE_WIDTH, Math.min(MAX_OPENCODE_WIDTH, startW + delta)));
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [opencodeWidth]);

    // — Terminal resize —
    const startTerminalResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = terminalHeight;
        const onMove = (ev: MouseEvent) => {
            const delta = startY - ev.clientY;
            setTerminalHeight(Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, startH + delta)));
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [terminalHeight]);


    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar that pushes content */}
            <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

            {/* Main content area — shifts right when menu is open */}
            <motion.div
                className="flex-1 flex flex-row min-w-0 overflow-hidden"
                animate={{ marginLeft: menuOpen ? SIDEBAR_WIDTH : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
                {/* Center column (header + page content + terminal + footer) */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Top bar */}
                    <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10 z-[90]">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setMenuOpen(v => !v)}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm
                                    ${menuOpen
                                        ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                                        : "bg-gray-800/80 border-white/10 text-gray-400 hover:text-white hover:bg-gray-700/80"
                                    }`}
                                aria-label="Toggle menu"
                            >
                                <PageIcon className="w-4 h-4" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xs font-bold text-white">{pageMeta.title}</h1>
                                {pageMeta.description && (
                                    <p className="text-[9px] text-gray-500">{pageMeta.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div ref={mailRef}>
                                <Link
                                    href="/messages"
                                    className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors backdrop-blur-sm
                                        ${pathname === "/messages"
                                            ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                                            : "bg-gray-800/80 border-white/10 text-gray-400 hover:text-white hover:bg-gray-700/80"
                                        }`}
                                    aria-label="Messages"
                                >
                                    <FiMail className="w-4 h-4" />
                                    {unread > 0 && (
                                        <span
                                            data-testid="messages-badge"
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse"
                                        >
                                            {unread > 9 ? "9+" : unread}
                                        </span>
                                    )}
                                </Link>
                            </div>

                            <button
                                onClick={() => setOpencodeOpen(v => !v)}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm
                                    ${opencodeOpen
                                        ? "bg-green-600/20 border-green-500/30 text-green-400"
                                        : "bg-gray-800/80 border-white/10 text-gray-400 hover:text-white hover:bg-gray-700/80"
                                    }`}
                                aria-label="Toggle OpenCode"
                                title="OpenCode Web UI"
                            >
                                <FiTerminal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Page content */}
                    <div className="flex-1 overflow-hidden relative">
                        {children}
                    </div>

                    {/* Terminal panel (slides up from footer) */}
                    <AnimatePresence>
                        {isTerminalOpen && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: terminalHeight }}
                                exit={{ height: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                className="shrink-0 overflow-hidden border-t border-white/10"
                            >
                                {/* Resize handle */}
                                <div
                                    className="h-1 cursor-ns-resize hover:bg-blue-500/40 transition-colors"
                                    onMouseDown={startTerminalResize}
                                />
                                <div className="h-[calc(100%-4px)]">
                                    <TerminalManager isOpen={true} height={terminalHeight - 4} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer status bar — hide terminal toggle on /command-center (uses its own dockview terminal) */}
                    <Footer
                        isTerminalOpen={isTerminalOpen}
                        onToggleTerminal={pathname === '/command-center' ? undefined : toggleTerminal}
                    />
                </div>

                {/* Right OpenCode panel (inline, resizable) */}
                <AnimatePresence>
                    {opencodeOpen && (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: opencodeWidth }}
                            exit={{ width: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            className="shrink-0 overflow-hidden border-l border-white/10 bg-gray-900 flex flex-row h-full"
                        >
                            {/* Drag resize handle */}
                            <div
                                className="w-1 cursor-ew-resize hover:bg-blue-500/40 transition-colors shrink-0 h-full"
                                onMouseDown={startOpencodeResize}
                            />
                            <div className="flex-1 flex flex-col" style={{ width: opencodeWidth - 4 }}>
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FiTerminal className="w-4 h-4 text-green-400" />
                                        <span className="text-xs font-bold text-white">OpenCode</span>
                                        <span className="text-[9px] text-gray-500">Web UI</span>
                                    </div>
                                    <button
                                        onClick={() => setOpencodeOpen(false)}
                                        className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
                                    >
                                        <FiX className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 bg-black">
                                    <iframe
                                        src="/opencode"
                                        className="w-full h-full border-0"
                                        title="OpenCode Web UI"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Toast notifications */}
            <AnimatePresence>
                {notificationToasts.length > 0 && (
                    <motion.div
                        data-testid="notification-toast-container"
                        style={toastStyle as any}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="w-[340px] max-w-[90vw] space-y-2"
                    >
                        {notificationToasts.map((t) => (
                            <motion.div
                                key={t.id}
                                data-testid="notification-toast"
                                data-message-id={t.id}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-md shadow-xl shadow-black/40 p-3"
                            >
                                <div className="flex items-start gap-2">
                                    <Link
                                        href="/messages"
                                        onClick={() => dismissToast(t.id)}
                                        className="flex-1 min-w-0 cursor-pointer"
                                        title="Open messages"
                                    >
                                        <div className="text-[11px] font-bold text-white truncate">{t.subject}</div>
                                        <div className="text-[10px] text-gray-400 truncate">from {t.fromName}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Open to view details</div>
                                    </Link>
                                    <button
                                        onClick={() => dismissToast(t.id)}
                                        className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
                                        aria-label="Dismiss notification"
                                    >
                                        <FiX className="w-3 h-3" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
