"use client";

import { FiTerminal } from "react-icons/fi";

interface FooterProps {
    isTerminalOpen?: boolean;
    onToggleTerminal?: () => void;
}

export default function Footer({ isTerminalOpen, onToggleTerminal }: FooterProps) {
    return (
        <div className="h-[22px] bg-[#1e1e1e] border-t border-[#333] text-[#999] flex items-center px-0 text-[10px] select-none shrink-0">
            <div className="flex-1" />
            {onToggleTerminal && (
                <div
                    className={`flex items-center gap-1 px-2.5 h-full cursor-pointer transition-colors ${isTerminalOpen ? 'bg-white/10 text-[#ccc]' : 'hover:bg-white/5 hover:text-[#ccc]'}`}
                    onClick={onToggleTerminal}
                    title="Toggle Terminal Panel"
                >
                    <FiTerminal className="w-2.5 h-2.5" />
                    <span>Terminal</span>
                </div>
            )}
        </div>
    );
}


