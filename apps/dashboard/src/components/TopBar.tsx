"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import { getUnreadCount } from "@/data/mockMessages";
import { NAV_ITEMS } from "@/components/navConfig";

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

export default function TopBar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [opencodeOpen, setOpencodeOpen] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(() => pathname === '/messages');
    const [opencodeWidth, setOpencodeWidth] = useState(DEFAULT_OPENCODE_WIDTH);
    const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
    const unread = getUnreadCount();
    const pageMeta = getPageMeta(pathname);
    const PageIcon = pageMeta.icon;

    const toggleTerminal = useCallback(() => setIsTerminalOpen(v => !v), []);

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
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
                                        {unread > 9 ? "9+" : unread}
                                    </span>
                                )}
                            </Link>

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
        </div>
    );
}
