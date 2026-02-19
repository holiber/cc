"use client";

import { motion } from "framer-motion";
import { FiCheck, FiCircle, FiLoader } from "react-icons/fi";
import type { TodoItem } from "@/types/agent";

const ROLE_COLORS: Record<string, string> = {
    orchestrator: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    admin: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    worker: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

function roleBadge(assignee?: string) {
    if (!assignee) return null;
    const colors = ROLE_COLORS[assignee.toLowerCase()] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30";
    return (
        <span className={`text-[8px] px-1.5 py-0.5 rounded border leading-none font-medium uppercase tracking-wide ${colors}`}>
            {assignee}
        </span>
    );
}

interface TodoListProps {
    todos: TodoItem[];
}

function statusIcon(status: TodoItem["status"]) {
    switch (status) {
        case "done": return <FiCheck className="w-3 h-3 text-green-400" />;
        case "in_progress": return <FiLoader className="w-3 h-3 text-blue-400 animate-spin" />;
        default: return <FiCircle className="w-3 h-3 text-gray-500" />;
    }
}

export default function TodoList({ todos }: TodoListProps) {
    return (
        <div className="space-y-1">
            {todos.map(todo => (
                <motion.div key={todo.id} layout initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`flex items-center gap-2 py-1 ${todo.status === "in_progress" ? "text-white" : todo.status === "done" ? "text-gray-500" : "text-gray-300"}`}>
                        <motion.div
                            animate={todo.status === "in_progress" ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            {statusIcon(todo.status)}
                        </motion.div>
                        <span className={`text-[11px] flex-1 ${todo.status === "done" ? "line-through" : ""}`}>{todo.text}</span>
                        {roleBadge(todo.assignee)}
                    </div>
                    {todo.children && (
                        <div className="ml-5 space-y-0.5">
                            {todo.children.map(c => (
                                <motion.div key={c.id} className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <motion.div
                                        animate={c.status === "in_progress" ? { scale: [1, 1.15, 1] } : {}}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                    >
                                        {statusIcon(c.status)}
                                    </motion.div>
                                    <span className={`text-[10px] flex-1 ${c.status === "done" ? "text-gray-500 line-through" : "text-gray-400"}`}>{c.text}</span>
                                    {roleBadge(c.assignee)}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
