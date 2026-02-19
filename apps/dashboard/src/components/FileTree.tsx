"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiFolder, FiFile, FiChevronRight, FiChevronDown, FiEdit
} from "react-icons/fi";
import type { FileNode, WorkerAgent } from "@/types/agent";

// Animated digit for line counts
function AnimatedDigit({ value, color }: { value: number; color: string }) {
    return <span className="font-mono text-[9px] tabular-nums" style={{ color }}>{value}</span>;
}

interface FileTreeProps {
    files: FileNode[];
    worker?: WorkerAgent;
    depth?: number;
    onPositionUpdate?: (name: string, y: number) => void;
}

export default function FileTree({ files, worker, depth = 0, onPositionUpdate }: FileTreeProps) {
    return (
        <div className="text-xs font-mono">
            {files.map(node => (
                <FileTreeNode
                    key={node.name}
                    node={node}
                    worker={worker}
                    depth={depth}
                    onPositionUpdate={onPositionUpdate}
                />
            ))}
        </div>
    );
}

function FileTreeNode({
    node,
    worker,
    depth,
    onPositionUpdate,
}: {
    node: FileNode;
    worker?: WorkerAgent;
    depth: number;
    onPositionUpdate?: (name: string, y: number) => void;
}) {
    const [expanded, setExpanded] = useState(node.expanded ?? false);
    const isFolder = node.type === "folder";
    const isActive = worker?.isWorking && worker.currentFile === node.name;
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (node.children?.some(c => c.name === worker?.currentFile)) setExpanded(true);
    }, [worker?.currentFile, node.children]);

    useEffect(() => {
        if (nodeRef.current && onPositionUpdate) {
            const rect = nodeRef.current.getBoundingClientRect();
            onPositionUpdate(node.name, rect.top);
        }
    }, [expanded, node.name, onPositionUpdate]);

    return (
        <div>
            <div ref={nodeRef} className="flex items-center">
                <motion.div
                    className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer flex-1 hover:bg-white/5"
                    style={{
                        paddingLeft: `${depth * 10}px`,
                        borderLeft: isActive ? `2px solid ${worker?.color}` : "2px solid transparent",
                    }}
                    onClick={() => isFolder && setExpanded(!expanded)}
                    animate={isActive ? { x: [0, 2, -2, 2, 0] } : {}}
                    transition={isActive ? { duration: 0.25, repeat: Infinity, repeatDelay: 0.15 } : {}}
                >
                    {isFolder && (
                        expanded
                            ? <FiChevronDown className="w-3 h-3 text-gray-500" />
                            : <FiChevronRight className="w-3 h-3 text-gray-500" />
                    )}
                    {isFolder
                        ? <FiFolder className="w-3 h-3 text-yellow-500" />
                        : <FiFile className="w-3 h-3 text-blue-400" />
                    }
                    <span className={`text-[10px] ${node.status === "modified" ? "text-yellow-400" : "text-gray-400"}`}>
                        {node.name}
                    </span>
                    {node.status === "modified" && <FiEdit className="w-2 h-2 text-yellow-400 ml-1" />}
                </motion.div>

                {isActive && worker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 text-[8px] ml-1">
                        <span className="text-green-400">+<AnimatedDigit value={worker.linesAdded} color="#22c55e" /></span>
                        <span className="text-red-400">-<AnimatedDigit value={worker.linesRemoved} color="#ef4444" /></span>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {isFolder && expanded && node.children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <FileTree files={node.children} worker={worker} depth={depth + 1} onPositionUpdate={onPositionUpdate} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
