"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useAnimationFrame } from "framer-motion";
import {
    DockviewReact,
    type DockviewReadyEvent,
    type IDockviewPanelProps,
    type DockviewApi,
} from "dockview";
import "dockview/dist/styles/dockview.css";
import {
    FiFolder, FiFile, FiChevronRight, FiChevronDown,
    FiCheck, FiCircle, FiLoader, FiSend,
    FiEdit, FiServer, FiLayout, FiActivity, FiX, FiTerminal,
} from "react-icons/fi";
import TerminalManager from "@/components/terminal/TerminalManager";
import Footer from "@/components/Footer";


// ─── Types ──────────────────────────────────────────────────

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
    assignee?: string;
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

interface SystemEvent {
    id: number;
    time: string;
    type: "info" | "agent" | "file" | "task" | "error";
    text: string;
    color?: string;
}

// ─── Demo File Contents ─────────────────────────────────────

const FILE_CONTENTS: Record<string, string> = {
    "page.tsx": `import Header from "@/components/Header"
import { fetchPosts } from "@/api/routes"

export default async function Home() {
  const posts = await fetchPosts()

  return (
    <main className="min-h-screen bg-gray-950">
      <Header />
      <section className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-white mb-8">
          Latest Posts
        </h1>
        <div className="grid gap-6">
          {posts.map(post => (
            <article key={post.id} className="p-4 rounded-lg
              border border-white/10 hover:border-purple-500/30
              transition-colors">
              <h2 className="text-lg font-semibold">{post.title}</h2>
              <p className="text-gray-400 text-sm mt-2">
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}`,
    "layout.tsx": `import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "My App",
  description: "Built with Next.js",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}`,
    "Header.tsx": `"use client"

import { useState } from "react"
import { motion } from "framer-motion"

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  return (
    <motion.header
      className={\`fixed top-0 w-full z-50 px-6 py-4
        backdrop-blur-xl transition-colors
        \${scrolled
          ? "bg-gray-950/80 border-b border-white/10"
          : "bg-transparent"}\`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <nav className="max-w-6xl mx-auto flex
        items-center justify-between">
        <span className="text-xl font-bold
          bg-gradient-to-r from-purple-400
          to-blue-400 bg-clip-text
          text-transparent">
          MyApp
        </span>
        <div className="flex gap-6 text-sm text-gray-300">
          <a href="#" className="hover:text-white">Home</a>
          <a href="#" className="hover:text-white">About</a>
          <a href="#" className="hover:text-white">Contact</a>
        </div>
      </nav>
    </motion.header>
  )
}`,
    "Button.tsx": `interface ButtonProps {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
}: ButtonProps) {
  const baseClasses = "rounded-lg font-medium transition-all"

  const variants = {
    primary: "bg-purple-600 hover:bg-purple-700 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400",
  }

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }

  return (
    <button
      onClick={onClick}
      className={\`\${baseClasses} \${variants[variant]}
        \${sizes[size]}\`}
    >
      {children}
    </button>
  )
}`,
    "schema.ts": `import { z } from "zod"

export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500),
  content: z.string(),
  author: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatar: z.string().url().optional(),
  }),
  tags: z.array(z.string()),
  published: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreatePostSchema = PostSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Post = z.infer<typeof PostSchema>
export type CreatePost = z.infer<typeof CreatePostSchema>`,
    "routes.ts": `import { Elysia } from "elysia"
import { CreatePostSchema } from "./schema"
import {
  listPosts,
  getPost,
  createPost,
  deletePost,
} from "./handlers"

const api = new Elysia()

  .get("/posts", async () => {
    const posts = await listPosts()
    return { data: posts }
  })

  .get("/posts/:id", async ({ params, set }) => {
    const post = await getPost(params.id)
    if (!post) { set.status = 404; return { error: "Not found" } }
    return { data: post }
  })

  .post("/posts", async ({ body, set }) => {
    const parsed = CreatePostSchema.parse(body)
    const post = await createPost(parsed)
    set.status = 201
    return { data: post }
  })

  .delete("/posts/:id", async ({ params }) => {
    await deletePost(params.id)
    return { success: true }
  })

export default api`,
    "handlers.ts": `import { type Post, type CreatePost } from "./schema"

// In-memory store for demo
const store = new Map<string, Post>()

export async function listPosts(): Promise<Post[]> {
  return Array.from(store.values())
    .sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    )
}

export async function getPost(
  id: string
): Promise<Post | undefined> {
  return store.get(id)
}

export async function createPost(
  input: CreatePost
): Promise<Post> {
  const post: Post = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  store.set(post.id, post)
  return post
}

export async function deletePost(id: string): Promise<void> {
  if (!store.has(id)) {
    throw new Error(\`Post \${id} not found\`)
  }
  store.delete(id)
}`,
    "package.json": `{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.0.0",
    "elysia": "^1.3.0",
    "zod": "^3.22.0"
  }
}`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,
};

// ─── Animated Primitives ────────────────────────────────────

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

function AnimatedDigit({ value, color }: { value: number; color: string }) {
    const spring = useSpring(value, { stiffness: 100, damping: 20 });
    const [display, setDisplay] = useState(0);
    useEffect(() => { spring.set(value); const unsub = spring.on("change", v => setDisplay(Math.round(v))); return unsub; }, [value, spring]);
    return <span className="font-mono text-[9px] tabular-nums" style={{ color }}>{display}</span>;
}

function AnimatedOrb({ isActive, size = 20 }: { isActive: boolean; size?: number }) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <motion.div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #c084fc, #7c3aed, #4c1d95)" }}
                animate={isActive ? { scale: [1, 1.15, 1], boxShadow: ["0 0 6px rgba(192,132,252,0.4)", "0 0 16px rgba(192,132,252,0.8)", "0 0 6px rgba(192,132,252,0.4)"] } : {}}
                transition={{ duration: 1.2, repeat: Infinity }} />
        </div>
    );
}

function TypewriterText({ text, speed = 25 }: { text: string; speed?: number }) {
    const [displayed, setDisplayed] = useState("");
    useEffect(() => { setDisplayed(""); let i = 0; const interval = setInterval(() => { if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; } else clearInterval(interval); }, speed); return () => clearInterval(interval); }, [text, speed]);
    return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

// ─── File Preview Modal ─────────────────────────────────────

function FilePreviewModal({ fileName, onClose }: { fileName: string; onClose: () => void }) {
    const content = FILE_CONTENTS[fileName] || "// Empty file";
    const lines = content.split("\n");
    const ext = fileName.split(".").pop() || "";
    const langLabel: Record<string, string> = { tsx: "TypeScript React", ts: "TypeScript", json: "JSON" };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-[700px] max-w-[90vw] max-h-[80vh] rounded-xl overflow-hidden shadow-2xl shadow-purple-500/10 border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* VS Code title bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-[#333]">
                    <div className="flex items-center gap-2">
                        <FiFile className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-gray-300 font-medium">{fileName}</span>
                        <span className="text-[9px] text-gray-600 ml-2">{langLabel[ext] || ext.toUpperCase()} — Read Only</span>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer">
                        <FiX className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* VS Code breadcrumb */}
                <div className="px-4 py-1 bg-[#252526] border-b border-[#333] text-[10px] text-gray-500">
                    src &gt; {fileName.endsWith(".tsx") || fileName.endsWith(".ts") ? (fileName.includes("Header") || fileName.includes("Button") ? "components" : fileName.includes("page") || fileName.includes("layout") ? "app" : "api") : ""} &gt; <span className="text-gray-400">{fileName}</span>
                </div>

                {/* Editor body */}
                <div className="bg-[#1e1e1e] overflow-auto max-h-[calc(80vh-80px)]">
                    <table className="w-full text-[11px] font-mono leading-[18px]">
                        <tbody>
                            {lines.map((line, i) => (
                                <tr key={i} className="hover:bg-[#2a2d2e]">
                                    <td className="text-right pr-4 pl-4 text-gray-600 select-none w-[1%] whitespace-nowrap">{i + 1}</td>
                                    <td className="pr-4 whitespace-pre text-gray-300">{colorize(line)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-[10px] text-white">
                    <div className="flex gap-4">
                        <span>Ln {lines.length}, Col 1</span>
                        <span>Spaces: 2</span>
                    </div>
                    <div className="flex gap-4">
                        <span>UTF-8</span>
                        <span>{langLabel[ext] || ext.toUpperCase()}</span>
                        <span>Read Only</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

/** Naive syntax highlighting — just enough to look like VS Code */
function colorize(line: string): React.ReactNode {
    // Keywords
    const keywords = /\b(import|export|from|const|let|var|function|return|if|else|async|await|default|type|interface|new|throw|typeof|extends)\b/g;
    // Strings
    const strings = /(["'`])(?:(?!\1).)*\1/g;
    // Comments
    if (line.trimStart().startsWith("//")) {
        return <span className="text-[#6a9955]">{line}</span>;
    }

    const parts: { start: number; end: number; cls: string }[] = [];

    let m: RegExpExecArray | null;
    const strRegex = new RegExp(strings.source, "g");
    while ((m = strRegex.exec(line)) !== null) {
        parts.push({ start: m.index, end: m.index + m[0].length, cls: "text-[#ce9178]" });
    }
    const kwRegex = new RegExp(keywords.source, "g");
    while ((m = kwRegex.exec(line)) !== null) {
        // Only if not inside a string
        if (!parts.some(p => m!.index >= p.start && m!.index < p.end)) {
            parts.push({ start: m.index, end: m.index + m[0].length, cls: "text-[#569cd6]" });
        }
    }

    if (parts.length === 0) return line;

    parts.sort((a, b) => a.start - b.start);
    const result: React.ReactNode[] = [];
    let cursor = 0;
    for (const p of parts) {
        if (p.start > cursor) result.push(line.slice(cursor, p.start));
        result.push(<span key={p.start} className={p.cls}>{line.slice(p.start, p.end)}</span>);
        cursor = p.end;
    }
    if (cursor < line.length) result.push(line.slice(cursor));
    return <>{result}</>;
}

// ─── Data ───────────────────────────────────────────────────

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

// ─── File Tree ──────────────────────────────────────────────

function FileTree({ files, workers, depth = 0, onPositionUpdate, onFileClick }: { files: FileNode[]; workers: WorkerAgent[]; depth?: number; onPositionUpdate?: (name: string, y: number) => void; onFileClick?: (name: string) => void }) {
    return (
        <div className="text-xs font-mono">
            {files.map(node => <FileTreeNode key={node.name} node={node} workers={workers} depth={depth} onPositionUpdate={onPositionUpdate} onFileClick={onFileClick} />)}
        </div>
    );
}

function FileTreeNode({ node, workers, depth, onPositionUpdate, onFileClick }: { node: FileNode; workers: WorkerAgent[]; depth: number; onPositionUpdate?: (name: string, y: number) => void; onFileClick?: (name: string) => void }) {
    const [expanded, setExpanded] = useState(node.expanded ?? false);
    const isFolder = node.type === "folder";
    const activeWorker = workers.find(w => w.isWorking && w.currentFile === node.name);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (node.children?.some(c => workers.some(w => w.isWorking && w.currentFile === c.name))) setExpanded(true); }, [workers, node.children]);

    useEffect(() => {
        if (nodeRef.current && onPositionUpdate) {
            const rect = nodeRef.current.getBoundingClientRect();
            onPositionUpdate(node.name, rect.top);
        }
    }, [expanded, onPositionUpdate, node.name]);

    const handleClick = () => {
        if (isFolder) { setExpanded(!expanded); }
        else if (onFileClick) { onFileClick(node.name); }
    };

    return (
        <div>
            <div ref={nodeRef} className="flex items-center">
                <motion.div
                    className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer flex-1 hover:bg-white/5"
                    style={{ paddingLeft: `${depth * 10}px`, borderLeft: activeWorker ? `2px solid ${activeWorker.color}` : "2px solid transparent" }}
                    onClick={handleClick}
                    animate={activeWorker ? { x: [0, 2, -2, 2, 0] } : {}}
                    transition={activeWorker ? { duration: 0.25, repeat: Infinity, repeatDelay: 0.15 } : {}}
                >
                    {isFolder && (expanded ? <FiChevronDown className="w-3 h-3 text-gray-500" /> : <FiChevronRight className="w-3 h-3 text-gray-500" />)}
                    {isFolder ? <FiFolder className="w-3 h-3 text-yellow-500" /> : <FiFile className="w-3 h-3 text-blue-400" />}
                    <span className={`text-[10px] ${node.status === "modified" ? "text-yellow-400" : "text-gray-400"}`}>{node.name}</span>
                    {node.status === "modified" && <FiEdit className="w-2 h-2 text-yellow-400 ml-1" />}
                </motion.div>
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
                        <FileTree files={node.children} workers={workers} depth={depth + 1} onPositionUpdate={onPositionUpdate} onFileClick={onFileClick} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Agent Cursor ───────────────────────────────────────────

function AgentCursor({ agent }: { agent: WorkerAgent }) {
    if (!agent.currentFile || !agent.isWorking) return null;
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0, y: agent.yPosition }}
            exit={{ opacity: 0, x: 20 }} transition={{ type: "spring", stiffness: 200, damping: 25 }}
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

// ─── Todo List ──────────────────────────────────────────────

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

// ─── Events Panel ───────────────────────────────────────────

function EventsPanel({ events }: { events: SystemEvent[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [events]);

    const typeIcon: Record<SystemEvent["type"], string> = {
        info: "ℹ️", agent: "🤖", file: "📄", task: "✅", error: "❌",
    };

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-0.5">
            {events.length === 0 && (
                <p className="text-[10px] text-gray-600 text-center mt-4">No events yet. Run the demo to see system events.</p>
            )}
            {events.map(ev => (
                <motion.div key={ev.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-1.5 py-0.5">
                    <span className="text-[9px] shrink-0 mt-px">{typeIcon[ev.type]}</span>
                    <div className="flex-1 min-w-0">
                        <span className="text-[9px] text-gray-500 font-mono mr-1.5">{ev.time}</span>
                        <span className="text-[10px]" style={{ color: ev.color || "#9ca3af" }}>{ev.text}</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────

export default function CommandCenterPage() {
    const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
    const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
    const [messages, setMessages] = useState<{ role: string; text: string; color?: string }[]>([{ role: "system", text: "Phase 2: Two Workers + Orchestrator" }]);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [filePositions, setFilePositions] = useState<Map<string, number>>(new Map());
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [opencodeOpen, setOpencodeOpen] = useState(false);
    const [opencodeWidth, setOpencodeWidth] = useState(480);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    const treeContainerRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const eventIdRef = useRef(0);
    const dockApiRef = useRef<DockviewApi | null>(null);
    const opencodeResizeRef = useRef<{ startX: number; startW: number } | null>(null);

    // Toggle terminal as a Dockview panel below the Agents panel
    const toggleTerminal = useCallback(() => {
        const api = dockApiRef.current;
        if (!api) return;
        const existing = api.getPanel('terminal');
        if (existing) {
            api.removePanel(existing);
            setIsTerminalOpen(false);
        } else {
            const agentsPanel = api.getPanel('agents');
            if (agentsPanel) {
                api.addPanel({
                    id: 'terminal',
                    component: 'terminal',
                    title: '🖥 Terminal',
                    position: { referencePanel: agentsPanel, direction: 'below' },
                });
            }
            setIsTerminalOpen(true);
        }
    }, []);

    // OpenCode horizontal resize
    const startOpencodeResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        opencodeResizeRef.current = { startX: e.clientX, startW: opencodeWidth };
        const onMove = (me: MouseEvent) => {
            if (!opencodeResizeRef.current) return;
            const delta = opencodeResizeRef.current.startX - me.clientX;
            const newW = Math.max(280, Math.min(900, opencodeResizeRef.current.startW + delta));
            setOpencodeWidth(newW);
        };
        const onUp = () => {
            opencodeResizeRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [opencodeWidth]);

    const [orchestrator, setOrchestrator] = useState({ isThinking: false, currentDecision: "", lastCommand: "", isSpeaking: false });

    const [workers, setWorkers] = useState<WorkerAgent[]>([
        { id: "backend", name: "Backend", color: "#10b981", icon: FiServer, currentFile: null, currentTask: "", thought: "", isWorking: false, linesAdded: 0, linesRemoved: 0, yPosition: 0 },
        { id: "frontend", name: "Frontend", color: "#60a5fa", icon: FiLayout, currentFile: null, currentTask: "", thought: "", isWorking: false, linesAdded: 0, linesRemoved: 0, yPosition: 0 },
    ]);

    const addEvent = useCallback((type: SystemEvent["type"], text: string, color?: string) => {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        eventIdRef.current += 1;
        setEvents(prev => [...prev, { id: eventIdRef.current, time, type, text, color }]);
    }, []);

    const updateFilePosition = useCallback((name: string, y: number) => {
        setFilePositions(prev => { const next = new Map(prev); next.set(name, y); return next; });
    }, []);

    const updateFileStatus = useCallback((fileName: string, status: FileStatus) => {
        setFiles(prev => { const update = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.name === fileName ? { ...n, status } : n.children ? { ...n, children: update(n.children) } : n); return update(prev); });
    }, []);

    const updateTodoStatus = useCallback((todoId: string, status: TodoItem["status"]) => {
        setTodos(prev => { const update = (items: TodoItem[]): TodoItem[] => items.map(i => i.id === todoId ? { ...i, status } : i.children ? { ...i, children: update(i.children) } : i); return update(prev); });
    }, []);

    useEffect(() => { chatScrollRef.current?.scrollTo(0, chatScrollRef.current.scrollHeight); }, [messages]);

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
    }, [filePositions]);

    const runDemo = useCallback(() => { if (isRunning) return; setIsRunning(true); setSequenceIndex(0); addEvent("info", "Demo started — orchestrating parallel agents"); }, [isRunning, addEvent]);

    useEffect(() => {
        if (!isRunning || sequenceIndex >= DEMO_SEQUENCE.length) {
            if (sequenceIndex >= DEMO_SEQUENCE.length && isRunning) {
                setWorkers(prev => prev.map(w => ({ ...w, currentFile: null, isWorking: false })));
                setOrchestrator({ isThinking: false, currentDecision: "All tasks completed!", lastCommand: "", isSpeaking: false });
                setMessages(prev => [...prev, { role: "system", text: "✅ Epic completed!" }]);
                addEvent("task", "Epic completed — all tasks done!", "#22c55e");
                setIsRunning(false);
            }
            return;
        }
        const step = DEMO_SEQUENCE[sequenceIndex];
        if (step.type === "orchestrator") {
            setOrchestrator({ isThinking: true, currentDecision: step.decision, lastCommand: step.command, isSpeaking: true });
            setMessages(prev => [...prev, { role: "orchestrator", text: step.command, color: "#a855f7" }]);
            addEvent("agent", `Orchestrator: ${step.command}`, "#a855f7");
            setTimeout(() => { setOrchestrator(p => ({ ...p, isThinking: false, isSpeaking: false })); setSequenceIndex(p => p + 1); }, 2500);
        } else if (step.type === "parallel") {
            if (step.backend) {
                setWorkers(p => p.map(w => w.id === "backend" ? { ...w, currentFile: step.backend!.file, currentTask: step.backend!.task, thought: step.backend!.thought, isWorking: true, linesAdded: step.backend!.added, linesRemoved: step.backend!.removed } : w));
                updateFileStatus(step.backend.file, "modified");
                updateTodoStatus(step.backend.todoId, "in_progress");
                addEvent("file", `Backend → ${step.backend.file} (+${step.backend.added} -${step.backend.removed})`, "#10b981");
                addEvent("task", `Task "${step.backend.task}" started`, "#10b981");
            }
            if (step.frontend) {
                setWorkers(p => p.map(w => w.id === "frontend" ? { ...w, currentFile: step.frontend!.file, currentTask: step.frontend!.task, thought: step.frontend!.thought, isWorking: true, linesAdded: step.frontend!.added, linesRemoved: step.frontend!.removed } : w));
                updateFileStatus(step.frontend.file, "modified");
                updateTodoStatus(step.frontend.todoId, "in_progress");
                addEvent("file", `Frontend → ${step.frontend.file} (+${step.frontend.added} -${step.frontend.removed})`, "#60a5fa");
                addEvent("task", `Task "${step.frontend.task}" started`, "#60a5fa");
            }
            setTimeout(() => {
                if (step.backend) { updateTodoStatus(step.backend.todoId, "done"); addEvent("task", `Task "${step.backend.task}" completed`, "#22c55e"); }
                if (step.frontend) { updateTodoStatus(step.frontend.todoId, "done"); addEvent("task", `Task "${step.frontend.task}" completed`, "#22c55e"); }
                setSequenceIndex(p => p + 1);
            }, step.duration);
        }
    }, [isRunning, sequenceIndex, addEvent, updateFileStatus, updateTodoStatus]);

    const sendMessage = useCallback(() => {
        if (!chatInput.trim()) return;
        setMessages(p => [...p, { role: "user", text: chatInput }]);
        addEvent("info", `User command: "${chatInput}"`);
        setTimeout(() => { setMessages(p => [...p, { role: "orchestrator", text: "Starting...", color: "#a855f7" }]); runDemo(); }, 500);
        setChatInput("");
    }, [chatInput, addEvent, runDemo]);

    // ── Dockview panel rendering ──

    const FileTreePanelComponent = useCallback(() => (
        <div className="p-3 h-full overflow-auto bg-gray-950">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 flex items-center gap-1"><FiFolder className="w-3 h-3 text-yellow-500" /> my-app/</span>
                <button onClick={runDemo} disabled={isRunning} className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded text-[9px] cursor-pointer">
                    {isRunning ? "..." : "▶ Run"}
                </button>
            </div>
            <div ref={treeContainerRef}>
                <FileTree files={files} workers={workers} onPositionUpdate={updateFilePosition} onFileClick={setPreviewFile} />
            </div>
        </div>
    ), [files, workers, isRunning, runDemo, updateFilePosition]);

    const AgentsPanelComponent = useCallback(() => (
        <div className="h-full relative p-3 bg-gray-950 overflow-hidden">
            {orchestrator.isSpeaking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-3 p-2 rounded bg-purple-900/20 border border-purple-500/20">
                    <AnimatedOrb isActive={true} size={18} />
                    <div className="text-[10px] text-purple-300 flex-1"><TypewriterText text={orchestrator.currentDecision} /></div>
                </motion.div>
            )}
            <div className="relative h-[calc(100%-60px)]">
                <AnimatePresence>
                    {workers.filter(w => w.isWorking).map(w => (
                        <AgentCursor key={w.id} agent={w} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    ), [orchestrator, workers]);

    const TodoPanelComponent = useCallback(() => (
        <div className="p-3 h-full overflow-auto bg-gray-950">
            <div className="flex items-center gap-1 mb-2">
                <FiCheck className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-medium text-white">Epic: Build Web App</span>
            </div>
            <TodoList todos={todos} />
        </div>
    ), [todos]);

    const ChatPanelComponent = useCallback(() => (
        <div className="flex flex-col h-full bg-gray-950 p-2">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-0.5 mb-2">
                {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[9px] p-1 rounded" style={{ backgroundColor: m.color ? m.color + "15" : "#374151", color: m.color || "#9ca3af" }}>
                        <span className="font-medium">{m.role}: </span>{m.text}
                    </motion.div>
                ))}
            </div>
            <div className="flex gap-1">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Command..." className="flex-1 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-[9px] focus:outline-none focus:border-purple-500" />
                <button onClick={sendMessage} className="px-1.5 py-1 bg-purple-600 hover:bg-purple-700 rounded cursor-pointer"><FiSend className="w-2.5 h-2.5 text-white" /></button>
            </div>
        </div>
    ), [messages, chatInput, sendMessage]);

    const EventsPanelComponent = useCallback(() => (
        <div className="h-full bg-gray-950">
            <EventsPanel events={events} />
        </div>
    ), [events]);

    const TerminalPanelComponent = useCallback(() => (
        <div className="h-full bg-[#1e1e1e]">
            <TerminalManager isOpen={true} height={999} />
        </div>
    ), []);

    const components = useRef<Record<string, React.FC<IDockviewPanelProps>>>({
        fileTree: () => <FileTreePanelComponent />,
        agents: () => <AgentsPanelComponent />,
        todoList: () => <TodoPanelComponent />,
        chat: () => <ChatPanelComponent />,
        events: () => <EventsPanelComponent />,
        terminal: () => <TerminalPanelComponent />,
    });

    useEffect(() => {
        components.current = {
            fileTree: () => <FileTreePanelComponent />,
            agents: () => <AgentsPanelComponent />,
            todoList: () => <TodoPanelComponent />,
            chat: () => <ChatPanelComponent />,
            events: () => <EventsPanelComponent />,
            terminal: () => <TerminalPanelComponent />,
        };
    }, [FileTreePanelComponent, AgentsPanelComponent, TodoPanelComponent, ChatPanelComponent, EventsPanelComponent, TerminalPanelComponent]);

    const onReady = useCallback((event: DockviewReadyEvent) => {
        const api = event.api;
        dockApiRef.current = api;

        const filesPanel = api.addPanel({
            id: "files",
            component: "fileTree",
            title: "📁 Files",
        });

        const agentsPanel = api.addPanel({
            id: "agents",
            component: "agents",
            title: "🤖 Agents",
            position: { referencePanel: filesPanel, direction: "right" },
        });

        const todosPanel = api.addPanel({
            id: "todos",
            component: "todoList",
            title: "✅ Tasks",
            position: { referencePanel: agentsPanel, direction: "right" },
        });

        const chatPanel = api.addPanel({
            id: "chat",
            component: "chat",
            title: "💬 Chat",
            position: { referencePanel: todosPanel, direction: "below" },
        });

        api.addPanel({
            id: "events",
            component: "events",
            title: "⚡ Events",
            position: { referencePanel: chatPanel },
        });

        // Set panel sizes
        api.getPanel("files")?.api.setSize({ width: 220 });
        api.getPanel("todos")?.api.setSize({ width: 260 });

        // Hide headers for single-panel groups (Files, Agents, Tasks)
        // and make all panels non-closable
        const hideHeadersForSinglePanelGroups = () => {
            for (const group of api.groups) {
                const isSingle = group.panels.length <= 1;
                if (group.header) {
                    group.header.hidden = isSingle;
                }
            }
        };

        // Run initially and on layout changes
        hideHeadersForSinglePanelGroups();
        api.onDidLayoutChange(() => hideHeadersForSinglePanelGroups());
    }, []);

    return (
        <main className="h-full bg-gray-950 flex flex-row overflow-hidden">
            {/* Dockview + right OpenCode panel in a row */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Dockview — takes remaining space above terminal */}
                <div className="flex-1 min-h-0">
                    <DockviewReact
                        className="dockview-theme-dark"
                        onReady={onReady}
                        components={components.current}
                        disableFloatingGroups={true}
                    />
                </div>

                {/* Footer status bar for this column */}
                <Footer
                    isTerminalOpen={isTerminalOpen}
                    onToggleTerminal={toggleTerminal}
                />
            </div>

            {/* ── Right OpenCode panel (inline, resizable) ── */}
            <AnimatePresence>
                {opencodeOpen && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: opencodeWidth }}
                        exit={{ width: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="shrink-0 overflow-hidden border-l border-white/10 bg-gray-900 flex flex-row h-full"
                    >
                        {/* Drag resize handle on LEFT edge of opencode panel */}
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

            {/* File preview modal */}
            <AnimatePresence>
                {previewFile && (
                    <FilePreviewModal fileName={previewFile} onClose={() => setPreviewFile(null)} />
                )}
            </AnimatePresence>
        </main>
    );
}
