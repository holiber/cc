"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FiMessageSquare, FiSend } from "react-icons/fi";
import type { ChatMessage } from "@/types/agent";

interface ChatProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    placeholder?: string;
}

const roleColors: Record<string, string> = {
    user: "bg-blue-500/20 text-blue-300",
    worker: "bg-green-500/20 text-green-300",
    orchestrator: "bg-purple-500/20 text-purple-300",
    system: "bg-gray-800 text-gray-400",
};

export default function Chat({ messages, onSend, placeholder = "Command..." }: ChatProps) {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const send = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-[10px] font-medium text-white mb-1 flex items-center gap-1">
                <FiMessageSquare className="w-2.5 h-2.5" /> Chat
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-0.5 mb-2">
                {messages.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-[9px] p-1 rounded ${roleColors[m.role] || roleColors.system}`}
                    >
                        <span className="font-medium">{m.role}: </span>{m.text}
                    </motion.div>
                ))}
            </div>
            <div className="flex gap-1">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder={placeholder}
                    className="flex-1 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-[9px] focus:outline-none focus:border-blue-500"
                />
                <button onClick={send} className="px-1.5 py-1 bg-blue-600 hover:bg-blue-700 rounded">
                    <FiSend className="w-2.5 h-2.5 text-white" />
                </button>
            </div>
        </div>
    );
}
