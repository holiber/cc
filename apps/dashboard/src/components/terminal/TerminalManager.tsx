"use client";

import { useState } from "react";
import { JabTerm } from "jabterm/react";
import "@xterm/xterm/css/xterm.css";
import { FiPlus, FiX, FiTerminal } from "react-icons/fi";
import { getTerminalWsUrl } from "@/lib/terminalWsUrl";

interface TerminalTab {
    id: string;
    title: string;
}

interface TerminalManagerProps {
    isOpen: boolean;
    height?: number;
}

export default function TerminalManager({ isOpen, height = 300 }: TerminalManagerProps) {
    const [tabs, setTabs] = useState<TerminalTab[]>([{ id: '1', title: 'Terminal' }]);
    const [activeTabId, setActiveTabId] = useState('1');

    const addTab = () => {
        const newId = Date.now().toString();
        const newTabs = [...tabs, { id: newId, title: 'Terminal' }];
        setTabs(newTabs);
        setActiveTabId(newId);
    };

    const removeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTabs = tabs.filter(t => t.id !== id);
        if (newTabs.length === 0) {
            setTabs([]);
            return;
        }
        setTabs(newTabs);
        if (activeTabId === id) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="flex flex-col h-full w-full bg-[#1e1e1e]">
            {/* Tabs Header */}
            <div className="flex items-center bg-[#252526] overflow-x-auto h-[35px] shrink-0 border-b border-[#1e1e1e]">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`
                            px-3 h-full flex items-center gap-2 text-xs cursor-pointer min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] select-none
                            ${activeTabId === tab.id ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#2a2d2e]'}
                        `}
                    >
                        <FiTerminal className="w-3 h-3 shrink-0" />
                        <span className="truncate flex-1">{tab.title}</span>
                        <div onClick={(e) => removeTab(tab.id, e)} className="p-0.5 hover:bg-white/10 rounded cursor-pointer">
                            <FiX className="w-3 h-3" />
                        </div>
                    </div>
                ))}
                <div
                    onClick={addTab}
                    className="px-2 h-full flex items-center justify-center cursor-pointer hover:bg-white/5 text-gray-400 border-r border-[#1e1e1e]"
                    title="New Terminal"
                >
                    <FiPlus className="w-4 h-4" />
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
                {tabs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                        <span className="text-sm">No active terminals</span>
                        <button onClick={addTab} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">
                            Open New Terminal
                        </button>
                    </div>
                ) : (
                    tabs.map(tab => (
                        <div key={tab.id} className={`absolute inset-0 ${activeTabId === tab.id ? 'block' : 'hidden'}`}>
                            <JabTerm
                                wsUrl={getTerminalWsUrl()}
                                fontSize={11}
                                onTitleChange={(t) => {
                                    setTabs(prev => prev.map(pt => pt.id === tab.id ? { ...pt, title: t } : pt));
                                }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
