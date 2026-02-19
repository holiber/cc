"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useAnimationFrame } from "framer-motion";
import {
    FiFolder, FiFile, FiChevronRight, FiChevronDown,
    FiCheck, FiCircle, FiLoader, FiMessageSquare, FiSend,
    FiEdit, FiServer, FiLayout
} from "react-icons/fi";

// Types
import { WorkerAgent } from "@/components/agent-ui/types";
type FileStatus = "unchanged" | "added" | "modified" | "deleted";

interface FileNode {
    name: string;
    type: "file" | "folder";
    status?: FileStatus;
    children?: FileNode[];
    expanded?: boolean;
    path?: string;
}

interface TodoItem {
    id: string;
    text: string;
    status: "pending" | "in_progress" | "done";
    assignee?: string;
    children?: TodoItem[];
}


import { ShinyText } from "@/components/agent-ui/ShinyText";
import { StarBorder } from "@/components/agent-ui/StarBorder";
import { AnimatedDigit } from "@/components/agent-ui/AnimatedDigit";
import { AnimatedOrb } from "@/components/agent-ui/AnimatedOrb";
import { TypewriterText } from "@/components/agent-ui/TypewriterText";


// Initial files
const INITIAL_FILES: FileNode[] = [
    { name: "node_modules", type: "folder", children: [], expanded: false },
    {
        name: "src", type: "folder", expanded: true, children: [
            { name: "app", type: "folder", expanded: true, children: [{ name: "page.tsx", type: "file" }, { name: "layout.tsx", type: "file" }] },
            { name: "components", type: "folder", expanded: true, children: [{ name: "Header.tsx", type: "file" }, { name: "Button.tsx", type: "file" }] },
            { name: "api", type: "folder", expanded: true, children: [{ name: "routes.ts", type: "file" }, { name: "schema.ts", type: "file" }, { name: "handlers.ts", type: "file" }] },
        ]
    },
    { name: "package.json", type: "file" },
    { name: "tsconfig.json", type: "file" },
];

const INITIAL_TODOS: TodoItem[] = [
    { id: "1", text: "Project Setup", status: "done", children: [{ id: "1.1", text: "Initialize Next.js", status: "done" }, { id: "1.2", text: "Configure TypeScript", status: "done" }] },
    { id: "2", text: "Build Backend API", status: "pending", assignee: "Backend", children: [{ id: "2.1", text: "Define API schema", status: "pending", assignee: "Backend" }, { id: "2.2", text: "Create route handlers", status: "pending", assignee: "Backend" }] },
    { id: "3", text: "Build Frontend UI", status: "pending", assignee: "Frontend", children: [{ id: "3.1", text: "Create Header", status: "pending", assignee: "Frontend" }, { id: "3.2", text: "Build main page", status: "pending", assignee: "Frontend" }] },
];

// Demo sequence
interface OrchestratorStep { type: "orchestrator"; decision: string; command: string; }
interface ParallelStep { type: "parallel"; backend?: { file: string; task: string; thought: string; todoId: string; added: number; removed: number }; frontend?: { file: string; task: string; thought: string; todoId: string; added: number; removed: number }; duration: number; }
type DemoStep = OrchestratorStep | ParallelStep;

const DEMO_SEQUENCE: DemoStep[] = [
    { type: "orchestrator", decision: "Analyzing epic... Backend and Frontend can work in parallel.", command: "Start API schema and Header" },
    { type: "parallel", backend: { file: "schema.ts", task: "DEFINE SCHEMA", thought: "Using Zod for type-safe validation...", todoId: "2.1", added: 45, removed: 0 }, frontend: { file: "Header.tsx", task: "BUILD HEADER", thought: "Glass style nav with blur effect...", todoId: "3.1", added: 78, removed: 12 }, duration: 4000 },
    { type: "orchestrator", decision: "Schema done. Header progressing.", command: "Backend: proceed to routes" },
    { type: "parallel", backend: { file: "routes.ts", task: "CREATE ROUTES", thought: "RESTful endpoints with middleware...", todoId: "2.2", added: 62, removed: 5 }, frontend: { file: "Header.tsx", task: "POLISHING", thought: "Adding responsive breakpoints...", todoId: "3.1", added: 23, removed: 8 }, duration: 3500 },
    { type: "orchestrator", decision: "Great progress! Coordinating.", command: "Continue parallel work" },
    { type: "parallel", backend: { file: "handlers.ts", task: "HANDLERS", thought: "Error handling and validation...", todoId: "2.2", added: 89, removed: 15 }, frontend: { file: "page.tsx", task: "BUILD PAGE", thought: "Connecting to API endpoints...", todoId: "3.2", added: 134, removed: 28 }, duration: 4000 },
    { type: "orchestrator", decision: "All tasks completed!", command: "Run final checks" },
];

// Track file positions for cursor placement
const filePositionsRef: Map<string, number> = new Map();

// File Tree - sticks to LEFT, no panel
function FileTree({ files, workers, depth = 0, onPositionUpdate }: { files: FileNode[]; workers: WorkerAgent[]; depth?: number; onPositionUpdate?: (name: string, y: number) => void }) {
    return (
        <div className="text-xs font-mono">
            {files.map(node => <FileTreeNode key={node.name} node={node} workers={workers} depth={depth} onPositionUpdate={onPositionUpdate} />)}
        </div>
    );
}

function FileTreeNode({ node, workers, depth, onPositionUpdate }: { node: FileNode; workers: WorkerAgent[]; depth: number; onPositionUpdate?: (name: string, y: number) => void }) {
    const [expanded, setExpanded] = useState(node.expanded ?? false);
    const isFolder = node.type === "folder";
    const activeWorker = workers.find(w => w.isWorking && w.currentFile === node.name);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (node.children?.some(c => workers.some(w => w.isWorking && w.currentFile === c.name))) setExpanded(true); }, [workers, node.children]);

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
                    className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer flex-1 hover:bg-white/5`}
                    style={{ paddingLeft: `${depth * 10}px`, borderLeft: activeWorker ? `2px solid ${activeWorker.color}` : "2px solid transparent" }}
                    onClick={() => isFolder && setExpanded(!expanded)}
                    animate={activeWorker ? { x: [0, 2, -2, 2, 0] } : {}}
                    transition={activeWorker ? { duration: 0.25, repeat: Infinity, repeatDelay: 0.15 } : {}}
                >
                    {isFolder && (expanded ? <FiChevronDown className="w-3 h-3 text-gray-500" /> : <FiChevronRight className="w-3 h-3 text-gray-500" />)}
                    {isFolder ? <FiFolder className="w-3 h-3 text-yellow-500" /> : <FiFile className="w-3 h-3 text-blue-400" />}
                    <span className={`text-[10px] ${node.status === "modified" ? "text-yellow-400" : "text-gray-400"}`}>{node.name}</span>
                    {node.status === "modified" && <FiEdit className="w-2 h-2 text-yellow-400 ml-1" />}
                </motion.div>

                {/* Counters inline with file */}
                {activeWorker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 text-[8px] ml-1">
                        <span className="text-green-400">+<AnimatedDigit value={activeWorker.linesAdded} color="#22c55e" /></span>
                        <span className="text-red-400">-<AnimatedDigit value={activeWorker.linesRemoved} color="#ef4444" /></span>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {isFolder && expanded && node.children && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <FileTree files={node.children} workers={workers} depth={depth + 1} onPositionUpdate={onPositionUpdate} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

import { AgentCursor } from "@/components/agent-ui/AgentCursor";


// Todo list - NO panel around subtasks, nice animated UI
function TodoList({ todos }: { todos: TodoItem[] }) {
    const statusIcon = (status: TodoItem["status"]) => {
        switch (status) {
            case "done": return <FiCheck className="w-3 h-3 text-green-400" />;
            case "in_progress": return <FiLoader className="w-3 h-3 text-blue-400 animate-spin" />;
            default: return <FiCircle className="w-3 h-3 text-gray-500" />;
        }
    };
    const assigneeColor: Record<string, string> = { "Backend": "#10b981", "Frontend": "#60a5fa" };

    return (
        <div className="space-y-1">
            {todos.map(todo => (
                <motion.div key={todo.id} layout initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`flex items-center gap-2 py-1 ${todo.status === "in_progress" ? "text-white" : todo.status === "done" ? "text-gray-500" : "text-gray-300"}`}>
                        <motion.div animate={todo.status === "in_progress" ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}>
                            {statusIcon(todo.status)}
                        </motion.div>
                        <span className={`text-[11px] flex-1 ${todo.status === "done" ? "line-through" : ""}`}>{todo.text}</span>
                        {todo.assignee && <span className="text-[8px] px-1 rounded" style={{ backgroundColor: assigneeColor[todo.assignee] + "30", color: assigneeColor[todo.assignee] }}>{todo.assignee}</span>}
                    </div>
                    {/* Subtasks - NO panel wrapper */}
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
export default function OrchestrationV2Page() {
    const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
    const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
    const [messages, setMessages] = useState<{ role: string; text: string; color?: string }[]>([{ role: "system", text: "Phase 2: Two Workers + Orchestrator" }]);
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [filePositions, setFilePositions] = useState<Map<string, number>>(new Map());
    const treeContainerRef = useRef<HTMLDivElement>(null);

    const [orchestrator, setOrchestrator] = useState({ isThinking: false, currentDecision: "", lastCommand: "", isSpeaking: false });

    const [workers, setWorkers] = useState<WorkerAgent[]>([
        { id: "backend", name: "Backend", color: "#10b981", icon: FiServer, currentFile: null, currentTask: "", thought: "", isWorking: false, linesAdded: 0, linesRemoved: 0, yPosition: 0 },
        { id: "frontend", name: "Frontend", color: "#60a5fa", icon: FiLayout, currentFile: null, currentTask: "", thought: "", isWorking: false, linesAdded: 0, linesRemoved: 0, yPosition: 0 },
    ]);

    const updateFilePosition = useCallback((name: string, y: number) => {
        setFilePositions(prev => { const next = new Map(prev); next.set(name, y); return next; });
    }, []);

    const updateFileStatus = (fileName: string, status: FileStatus) => {
        setFiles(prev => { const update = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.name === fileName ? { ...n, status } : n.children ? { ...n, children: update(n.children) } : n); return update(prev); });
    };

    const updateTodoStatus = (todoId: string, status: TodoItem["status"]) => {
        setTodos(prev => { const update = (items: TodoItem[]): TodoItem[] => items.map(i => i.id === todoId ? { ...i, status } : i.children ? { ...i, children: update(i.children) } : i); return update(prev); });
    };

    // Update worker Y positions based on current file
    useEffect(() => {
        if (treeContainerRef.current) {
            const containerTop = treeContainerRef.current.getBoundingClientRect().top;
            setWorkers(prev => prev.map(w => {
                if (w.currentFile && filePositions.has(w.currentFile)) {
                    const fileY = filePositions.get(w.currentFile)! - containerTop - 10;
                    return { ...w, yPosition: Math.max(0, fileY) };
                }
                return w;
            }));
        }
    }, [filePositions, workers.map(w => w.currentFile).join(",")]);

    const runDemo = () => { if (isRunning) return; setIsRunning(true); setSequenceIndex(0); };

    useEffect(() => {
        if (!isRunning || sequenceIndex >= DEMO_SEQUENCE.length) {
            if (sequenceIndex >= DEMO_SEQUENCE.length && isRunning) {
                setWorkers(prev => prev.map(w => ({ ...w, currentFile: null, isWorking: false })));
                setOrchestrator({ isThinking: false, currentDecision: "All tasks completed!", lastCommand: "", isSpeaking: false });
                setMessages(prev => [...prev, { role: "system", text: "✅ Epic completed!" }]);
                setIsRunning(false);
            }
            return;
        }
        const step = DEMO_SEQUENCE[sequenceIndex];
        if (step.type === "orchestrator") {
            setOrchestrator({ isThinking: true, currentDecision: step.decision, lastCommand: step.command, isSpeaking: true });
            setMessages(prev => [...prev, { role: "orchestrator", text: step.command, color: "#a855f7" }]);
            setTimeout(() => { setOrchestrator(p => ({ ...p, isThinking: false, isSpeaking: false })); setSequenceIndex(p => p + 1); }, 2500);
        } else if (step.type === "parallel") {
            if (step.backend) { setWorkers(p => p.map(w => w.id === "backend" ? { ...w, currentFile: step.backend!.file, currentTask: step.backend!.task, thought: step.backend!.thought, isWorking: true, linesAdded: step.backend!.added, linesRemoved: step.backend!.removed } : w)); updateFileStatus(step.backend.file, "modified"); updateTodoStatus(step.backend.todoId, "in_progress"); }
            if (step.frontend) { setWorkers(p => p.map(w => w.id === "frontend" ? { ...w, currentFile: step.frontend!.file, currentTask: step.frontend!.task, thought: step.frontend!.thought, isWorking: true, linesAdded: step.frontend!.added, linesRemoved: step.frontend!.removed } : w)); updateFileStatus(step.frontend.file, "modified"); updateTodoStatus(step.frontend.todoId, "in_progress"); }
            setTimeout(() => { if (step.backend) updateTodoStatus(step.backend.todoId, "done"); if (step.frontend) updateTodoStatus(step.frontend.todoId, "done"); setSequenceIndex(p => p + 1); }, step.duration);
        }
    }, [isRunning, sequenceIndex]);

    const sendMessage = () => { if (!chatInput.trim()) return; setMessages(p => [...p, { role: "user", text: chatInput }]); setTimeout(() => { setMessages(p => [...p, { role: "orchestrator", text: "Starting...", color: "#a855f7" }]); runDemo(); }, 500); setChatInput(""); };

    return (
        <main className="min-h-screen h-screen bg-gray-950 flex overflow-hidden">
            {/* Collapsed sidebar */}
            <div className={`${sidebarCollapsed ? "w-10" : "w-40"} shrink-0 border-r border-white/10 p-2 transition-all duration-300`}>
                <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-500 hover:text-white text-xs">{sidebarCollapsed ? "→" : "←"}</button>
            </div>

            {/* File Tree - sticks to LEFT */}
            <div className="w-56 shrink-0 p-3 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400">my-app/</span>
                    <button onClick={runDemo} disabled={isRunning} className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded text-[9px]">
                        {isRunning ? "..." : "Run"}
                    </button>
                </div>
                <div ref={treeContainerRef}>
                    <FileTree files={files} workers={workers} onPositionUpdate={updateFilePosition} />
                </div>
            </div>

            {/* MIDDLE - Agent cursor space */}
            <div className="flex-1 relative p-3">
                <h1 className="text-sm font-bold text-white mb-1">Agent Orchestration v2</h1>
                <p className="text-[9px] text-gray-500 mb-3">Two Workers + Orchestrator</p>

                {/* Orchestrator status */}
                {orchestrator.isSpeaking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-3 p-2 rounded bg-purple-900/20 border border-purple-500/20">
                        <AnimatedOrb isActive={true} size={18} />
                        <div className="text-[10px] text-purple-300 flex-1"><TypewriterText text={orchestrator.currentDecision} /></div>
                    </motion.div>
                )}

                {/* Floating agent cursors - slide on right side of tree */}
                <div className="relative h-[calc(100%-80px)]">
                    <AnimatePresence>
                        {workers.filter(w => w.isWorking).map(w => (
                            <AgentCursor key={w.id} agent={w} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* RIGHT COLUMN - Todo (top) + Chat (full height) */}
            <div className="w-64 shrink-0 flex flex-col border-l border-white/10">
                {/* Todo at top - no heavy panel */}
                <div className="p-2 border-b border-white/10">
                    <div className="text-[10px] font-medium text-white mb-1 flex items-center gap-1">
                        <FiCheck className="w-2.5 h-2.5" /> Epic: Build Web App
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
                            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[9px] p-1 rounded" style={{ backgroundColor: m.color ? m.color + "15" : "#374151", color: m.color || "#9ca3af" }}>
                                <span className="font-medium">{m.role}: </span>{m.text}
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Command..." className="flex-1 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-[9px] focus:outline-none focus:border-purple-500" />
                        <button onClick={sendMessage} className="px-1.5 py-1 bg-purple-600 hover:bg-purple-700 rounded"><FiSend className="w-2.5 h-2.5 text-white" /></button>
                    </div>
                </div>
            </div>
        </main>
    );
}
