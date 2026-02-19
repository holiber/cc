"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useAnimationFrame } from "framer-motion";
import {
    FiFolder, FiFile, FiChevronRight, FiChevronDown,
    FiCheck, FiCircle, FiLoader, FiMessageSquare, FiSend,
    FiEdit, FiCpu
} from "react-icons/fi";

// Types
type FileStatus = "unchanged" | "added" | "modified" | "deleted";

interface FileNode {
    name: string;
    type: "file" | "folder";
    status?: FileStatus;
    children?: FileNode[];
    expanded?: boolean;
}

interface TodoItem {
    id: string;
    text: string;
    status: "pending" | "in_progress" | "done";
    children?: TodoItem[];
}

interface WorkerAgent {
    id: string;
    name: string;
    color: string;
    icon: React.ElementType;
    currentFile: string | null;
    currentTask: string;
    thought: string;
    isWorking: boolean;
    linesAdded: number;
    linesRemoved: number;
    yPosition: number;
}

// ---------- SHINY TEXT ----------
function ShinyText({ text, color }: { text: string; color: string }) {
    const progress = useMotionValue(0);
    const lastTimeRef = useRef<number | null>(null);
    const elapsedRef = useRef(0);

    useAnimationFrame((time) => {
        if (lastTimeRef.current === null) { lastTimeRef.current = time; return; }
        elapsedRef.current += time - lastTimeRef.current;
        lastTimeRef.current = time;
        progress.set((elapsedRef.current % 2000) / 2000 * 100);
    });

    const backgroundPosition = useTransform(progress, p => `${150 - p * 2}% center`);

    return (
        <motion.span className="font-bold text-xs inline-block" style={{ backgroundImage: `linear-gradient(120deg, ${color} 0%, ${color} 35%, #fff 50%, ${color} 65%, ${color} 100%)`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundPosition }}>{text}</motion.span>
    );
}

// ---------- STAR BORDER ----------
function StarBorder({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <div className="star-border-container">
            <style jsx>{`
                .star-border-container { display: inline-block; position: relative; border-radius: 10px; overflow: hidden; padding: 1px; }
                .border-gradient-bottom { position: absolute; width: 300%; height: 50%; opacity: 0.7; bottom: -12px; right: -250%; border-radius: 50%; background: radial-gradient(circle, ${color}, transparent 10%); animation: star-bottom 4s linear infinite alternate; z-index: 0; }
                .border-gradient-top { position: absolute; opacity: 0.7; width: 300%; height: 50%; top: -12px; left: -250%; border-radius: 50%; background: radial-gradient(circle, ${color}, transparent 10%); animation: star-top 4s linear infinite alternate; z-index: 0; }
                .inner-content { position: relative; border: 1px solid ${color}40; background: rgba(0,0,0,0.95); border-radius: 10px; z-index: 1; }
                @keyframes star-bottom { 0% { transform: translateX(0%); opacity: 1; } 100% { transform: translateX(-100%); opacity: 0; } }
                @keyframes star-top { 0% { transform: translateX(0%); opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
            `}</style>
            <div className="border-gradient-bottom" />
            <div className="border-gradient-top" />
            <div className="inner-content">{children}</div>
        </div>
    );
}

// ---------- ANIMATED COUNTER ----------
function AnimatedDigit({ value, color }: { value: number; color: string }) {
    const spring = useSpring(value, { stiffness: 100, damping: 20 });
    const [display, setDisplay] = useState(0);
    useEffect(() => { spring.set(value); const unsub = spring.on("change", v => setDisplay(Math.round(v))); return unsub; }, [value, spring]);
    return <span className="font-mono text-[9px] tabular-nums" style={{ color }}>{display}</span>;
}

// Initial files
const INITIAL_FILES: FileNode[] = [
    { name: "node_modules", type: "folder", children: [], expanded: false },
    { name: "public", type: "folder", expanded: false, children: [{ name: "favicon.ico", type: "file" }, { name: "index.html", type: "file" }] },
    { name: "src", type: "folder", expanded: true, children: [{ name: "index.css", type: "file" }, { name: "index.ts", type: "file" }, { name: "App.tsx", type: "file" }] },
    { name: ".gitignore", type: "file" },
    { name: "package.json", type: "file" },
    { name: "README.md", type: "file" },
];

const INITIAL_TODOS: TodoItem[] = [
    { id: "1", text: "Initialize Next.js", status: "done", children: [{ id: "1.1", text: "Create package.json", status: "done" }, { id: "1.2", text: "Setup TypeScript", status: "done" }] },
    { id: "2", text: "Build API layer", status: "in_progress", children: [{ id: "2.1", text: "Create API schema", status: "in_progress" }, { id: "2.2", text: "Implement endpoints", status: "pending" }] },
    { id: "3", text: "Create components", status: "pending", children: [{ id: "3.1", text: "Header component", status: "pending" }, { id: "3.2", text: "Main layout", status: "pending" }] },
];

const DEMO_SEQUENCE = [
    { file: ".gitignore", task: "INIT REPO", thought: "Should not forget .env...", added: 12, removed: 0, duration: 3000 },
    { file: "package.json", task: "SETUP DEPS", thought: "Adding TypeScript and React...", added: 45, removed: 5, duration: 2500 },
    { file: "index.ts", task: "BUILD API", thought: "Using Zod for validation...", added: 89, removed: 15, duration: 4000 },
    { file: "App.tsx", task: "CREATE UI", thought: "Adding glassmorphism styles...", added: 134, removed: 28, duration: 3500 },
];

// Track file element positions
const filePositionsRef: Map<string, number> = new Map();

// File Tree - sticks to LEFT
function FileTree({ files, worker, depth = 0, onPositionUpdate }: { files: FileNode[]; worker: WorkerAgent; depth?: number; onPositionUpdate?: (name: string, y: number) => void }) {
    return (
        <div className="text-xs font-mono">
            {files.map(node => <FileTreeNode key={node.name} node={node} worker={worker} depth={depth} onPositionUpdate={onPositionUpdate} />)}
        </div>
    );
}

function FileTreeNode({ node, worker, depth, onPositionUpdate }: { node: FileNode; worker: WorkerAgent; depth: number; onPositionUpdate?: (name: string, y: number) => void }) {
    const [expanded, setExpanded] = useState(node.expanded ?? false);
    const isFolder = node.type === "folder";
    const isActive = worker.isWorking && worker.currentFile === node.name;
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (node.children?.some(c => c.name === worker.currentFile)) setExpanded(true); }, [worker.currentFile, node.children]);

    // Update position when expanded changes or on mount
    useEffect(() => {
        if (nodeRef.current && onPositionUpdate) {
            const rect = nodeRef.current.getBoundingClientRect();
            onPositionUpdate(node.name, rect.top);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded]);

    return (
        <div>
            <div ref={nodeRef} className="flex items-center">
                <motion.div
                    className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer flex-1 hover:bg-white/5"
                    style={{ paddingLeft: `${depth * 10}px`, borderLeft: isActive ? `2px solid ${worker.color}` : "2px solid transparent" }}
                    onClick={() => isFolder && setExpanded(!expanded)}
                    animate={isActive ? { x: [0, 2, -2, 2, 0] } : {}}
                    transition={isActive ? { duration: 0.25, repeat: Infinity, repeatDelay: 0.15 } : {}}
                >
                    {isFolder && (expanded ? <FiChevronDown className="w-3 h-3 text-gray-500" /> : <FiChevronRight className="w-3 h-3 text-gray-500" />)}
                    {isFolder ? <FiFolder className="w-3 h-3 text-yellow-500" /> : <FiFile className="w-3 h-3 text-blue-400" />}
                    <span className={`text-[10px] ${node.status === "modified" ? "text-yellow-400" : "text-gray-400"}`}>{node.name}</span>
                    {node.status === "modified" && <FiEdit className="w-2 h-2 text-yellow-400 ml-1" />}
                </motion.div>

                {isActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 text-[8px] ml-1">
                        <span className="text-green-400">+<AnimatedDigit value={worker.linesAdded} color="#22c55e" /></span>
                        <span className="text-red-400">-<AnimatedDigit value={worker.linesRemoved} color="#ef4444" /></span>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {isFolder && expanded && node.children && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <FileTree files={node.children} worker={worker} depth={depth + 1} onPositionUpdate={onPositionUpdate} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Agent Cursor - slides on RIGHT side of tree
function AgentCursor({ agent }: { agent: WorkerAgent }) {
    if (!agent.currentFile || !agent.isWorking) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, y: agent.yPosition }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="absolute"
        >
            <div className="flex items-center gap-1">
                <motion.span className="text-sm" style={{ color: agent.color }} animate={{ x: [-3, 0, -3] }} transition={{ duration: 0.5, repeat: Infinity }}>←</motion.span>
                <StarBorder color={agent.color}>
                    <div className="p-2 flex items-center gap-2 w-[180px]">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: agent.color + "20", border: `1.5px solid ${agent.color}` }}>
                            <agent.icon className="w-3 h-3" style={{ color: agent.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <ShinyText text={agent.currentTask} color={agent.color} />
                            <p className="text-[9px] text-gray-400 truncate">{agent.thought}</p>
                        </div>
                    </div>
                </StarBorder>
            </div>
        </motion.div>
    );
}

// Todo list - clean, animated, no heavy panels
function TodoList({ todos }: { todos: TodoItem[] }) {
    const statusIcon = (status: TodoItem["status"]) => {
        switch (status) {
            case "done": return <FiCheck className="w-3 h-3 text-green-400" />;
            case "in_progress": return <FiLoader className="w-3 h-3 text-blue-400 animate-spin" />;
            default: return <FiCircle className="w-3 h-3 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-1">
            {todos.map(todo => (
                <motion.div key={todo.id} layout initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`flex items-center gap-2 py-1 ${todo.status === "in_progress" ? "text-white" : todo.status === "done" ? "text-gray-500" : "text-gray-300"}`}>
                        <motion.div animate={todo.status === "in_progress" ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}>
                            {statusIcon(todo.status)}
                        </motion.div>
                        <span className={`text-[11px] flex-1 ${todo.status === "done" ? "line-through" : ""}`}>{todo.text}</span>
                    </div>
                    {todo.children && (
                        <div className="ml-5 space-y-0.5">
                            {todo.children.map(c => (
                                <motion.div key={c.id} className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <motion.div animate={c.status === "in_progress" ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.8, repeat: Infinity }}>
                                        {statusIcon(c.status)}
                                    </motion.div>
                                    <span className={`text-[10px] ${c.status === "done" ? "text-gray-500 line-through" : "text-gray-400"}`}>{c.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}

// Main
export default function OrchestrationPage() {
    const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
    const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([{ role: "system", text: "Orchestrator ready. Single worker." }]);
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [filePositions, setFilePositions] = useState<Map<string, number>>(new Map());
    const treeContainerRef = useRef<HTMLDivElement>(null);

    const [worker, setWorker] = useState<WorkerAgent>({
        id: "worker-1", name: "Worker", color: "#60a5fa", icon: FiCpu,
        currentFile: null, currentTask: "", thought: "", isWorking: false, linesAdded: 0, linesRemoved: 0, yPosition: 0,
    });

    const updateFilePosition = useCallback((name: string, y: number) => {
        setFilePositions(prev => { const next = new Map(prev); next.set(name, y); return next; });
    }, []);

    // Update worker Y position based on current file
    useEffect(() => {
        if (treeContainerRef.current && worker.currentFile && filePositions.has(worker.currentFile)) {
            const containerTop = treeContainerRef.current.getBoundingClientRect().top;
            const fileY = filePositions.get(worker.currentFile)! - containerTop - 10;
            setWorker(prev => ({ ...prev, yPosition: Math.max(0, fileY) }));
        }
    }, [filePositions, worker.currentFile]);

    const expandToFile = (fileName: string) => {
        setFiles(prev => { const expand = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.type === "folder" ? (n.children?.some(c => c.name === fileName) ? { ...n, expanded: true } : { ...n, children: n.children ? expand(n.children) : n.children }) : n); return expand(prev); });
    };

    const runDemo = () => { if (isRunning) return; setIsRunning(true); setSequenceIndex(0); };

    useEffect(() => {
        if (!isRunning || sequenceIndex >= DEMO_SEQUENCE.length) {
            if (sequenceIndex >= DEMO_SEQUENCE.length && isRunning) {
                setWorker(p => ({ ...p, currentFile: null, isWorking: false }));
                setMessages(p => [...p, { role: "system", text: "✅ All tasks completed!" }]);
                setIsRunning(false);
            }
            return;
        }

        const step = DEMO_SEQUENCE[sequenceIndex];
        const fileName = step.file.includes("/") ? step.file.split("/").pop()! : step.file;
        if (step.file.includes("/")) expandToFile(fileName);

        setWorker(p => ({ ...p, currentFile: fileName, currentTask: step.task, thought: step.thought, isWorking: true, linesAdded: step.added, linesRemoved: step.removed }));

        setFiles(prev => { const update = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.name === fileName ? { ...n, status: "modified" as FileStatus } : n.children ? { ...n, children: update(n.children) } : n); return update(prev); });

        setMessages(p => [...p, { role: "worker", text: `${step.file}: ${step.task}` }]);

        const timer = setTimeout(() => setSequenceIndex(p => p + 1), step.duration);
        return () => clearTimeout(timer);
    }, [isRunning, sequenceIndex]);

    const sendMessage = () => { if (!chatInput.trim()) return; setMessages(p => [...p, { role: "user", text: chatInput }]); setTimeout(() => { setMessages(p => [...p, { role: "orchestrator", text: "Starting..." }]); runDemo(); }, 500); setChatInput(""); };

    return (
        <main className="min-h-screen h-screen bg-gray-950 flex overflow-hidden">
            {/* Collapsed sidebar */}
            <div className={`${sidebarCollapsed ? "w-10" : "w-40"} shrink-0 border-r border-white/10 p-2 transition-all duration-300`}>
                <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-500 hover:text-white text-xs">{sidebarCollapsed ? "→" : "←"}</button>
            </div>

            {/* File Tree - sticks to LEFT */}
            <div className="w-48 shrink-0 p-3 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400">project/</span>
                    <button onClick={runDemo} disabled={isRunning} className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded text-[9px]">
                        {isRunning ? "..." : "Run"}
                    </button>
                </div>
                <div ref={treeContainerRef}>
                    <FileTree files={files} worker={worker} onPositionUpdate={updateFilePosition} />
                </div>
            </div>

            {/* MIDDLE - Agent cursor space */}
            <div className="flex-1 relative p-3">
                <h1 className="text-sm font-bold text-white mb-1">Agent Orchestration</h1>
                <p className="text-[9px] text-gray-500 mb-3">Phase 1: Single Worker</p>

                {/* Floating agent cursor */}
                <div className="relative h-[calc(100%-60px)]">
                    <AnimatePresence>
                        <AgentCursor agent={worker} />
                    </AnimatePresence>
                </div>
            </div>

            {/* RIGHT COLUMN - Todo (top) + Chat (full height) */}
            <div className="w-56 shrink-0 flex flex-col border-l border-white/10">
                {/* Todo at top */}
                <div className="p-2 border-b border-white/10">
                    <div className="text-[10px] font-medium text-white mb-1 flex items-center gap-1">
                        <FiCheck className="w-2.5 h-2.5" /> Epic
                    </div>
                    <TodoList todos={todos} />
                </div>

                {/* Chat - takes remaining height */}
                <div className="flex-1 flex flex-col p-2">
                    <div className="text-[10px] font-medium text-white mb-1 flex items-center gap-1">
                        <FiMessageSquare className="w-2.5 h-2.5" /> Chat
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-0.5 mb-2">
                        {messages.map((m, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`text-[9px] p-1 rounded ${m.role === "user" ? "bg-blue-500/20 text-blue-300" : m.role === "worker" ? "bg-green-500/20 text-green-300" : m.role === "orchestrator" ? "bg-purple-500/20 text-purple-300" : "bg-gray-800 text-gray-400"}`}>
                                <span className="font-medium">{m.role}: </span>{m.text}
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Command..." className="flex-1 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-[9px] focus:outline-none focus:border-blue-500" />
                        <button onClick={sendMessage} className="px-1.5 py-1 bg-blue-600 hover:bg-blue-700 rounded"><FiSend className="w-2.5 h-2.5 text-white" /></button>
                    </div>
                </div>
            </div>
        </main>
    );
}
