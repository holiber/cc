"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiMenu,
    FiX,
    FiBook,
    FiExternalLink,
    FiSettings,
    FiLogOut,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { useStorybookUrl } from "@/hooks/useStorybookUrl";
import { NAV_ITEMS } from "@/components/navConfig";




interface BurgerMenuProps {
    /** When provided, the toggle button is hidden (controlled externally) */
    isOpen?: boolean;
    /** Called when the panel should close */
    onClose?: () => void;
    /** Optional callback for Storybook - intercepts navigation */
    onNavigate?: (href: string) => void;
}

export default function BurgerMenu({ isOpen: controlledIsOpen, onClose, onNavigate }: BurgerMenuProps = {}) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
    const menuRef = useRef<HTMLDivElement>(null);
    const storybookUrl = useStorybookUrl();

    const close = useCallback(() => {
        if (isControlled) { onClose?.(); }
        else { setInternalIsOpen(false); }
    }, [isControlled, onClose]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                close();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, close]);

    // Close on Escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") close();
        }
        if (isOpen) {
            document.addEventListener("keydown", handleKey);
        }
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, close]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="
                        fixed left-0 top-0 h-full w-56 z-[100]
                        bg-gray-900/95 backdrop-blur-xl
                        border-r border-gray-700/50
                        shadow-2xl shadow-black/50
                        overflow-y-auto flex flex-col
                    "
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <FiMenu className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">Command</div>
                                <div className="text-[9px] text-gray-500">Center</div>
                            </div>
                        </div>
                        <button onClick={close} className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer">
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="py-2 flex-1">
                        {NAV_ITEMS.map((item, i) => (
                            <motion.a
                                key={item.href}
                                href={onNavigate ? undefined : item.href}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={(e) => {
                                    if (onNavigate) {
                                        e.preventDefault();
                                        onNavigate(item.href);
                                    }
                                    close();
                                }}
                                style={onNavigate ? { cursor: "pointer" } : undefined}
                                className="
                                        flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg
                                        text-gray-300 hover:text-white hover:bg-gray-800/60
                                        transition-colors group
                                    "
                            >
                                <item.icon className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-xs font-medium truncate">{item.label}</div>
                                    <div className="text-[9px] text-gray-500 truncate">{item.description}</div>
                                </div>
                            </motion.a>
                        ))}
                    </div>

                    {/* Tools section */}
                    <div className="border-t border-gray-700/50 py-2">
                        <div className="px-4 py-1">
                            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold">Tools</span>
                        </div>
                        <a
                            href={storybookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors group"
                        >
                            <FiBook className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium">Storybook</div>
                                <div className="text-[9px] text-gray-500">:6006</div>
                            </div>
                            <FiExternalLink className="w-3 h-3 text-gray-600" />
                        </a>
                        <a
                            href="/admin"
                            className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors group"
                        >
                            <FiSettings className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs font-medium">Admin</div>
                                <div className="text-[9px] text-gray-500">Payload CMS</div>
                            </div>
                        </a>
                    </div>

                    {/* Footer - logout */}
                    <div className="px-3 py-2 border-t border-gray-700/40 flex items-center justify-between">
                        <span className="text-[9px] text-gray-600">CommandCenter v0.1</span>
                        <button
                            id="logout-button"
                            onClick={async () => {
                                await fetch('/api/users/logout', { method: 'POST' });
                                window.location.href = '/admin/login';
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Logout"
                        >
                            <FiLogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
