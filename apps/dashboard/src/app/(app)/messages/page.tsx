"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiMail, FiFile, FiImage, FiVideo, FiCode, FiFileText,
    FiCheck, FiLoader, FiAlertCircle, FiSend, FiClock,
    FiChevronLeft, FiPaperclip, FiArrowRight,
    FiGithub, FiGitBranch, FiAtSign, FiMessageCircle, FiHash,
    FiFolder,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import {
    mockMessages, getUnreadCount,
    type Message, type MessageType, type ArtifactKind, type EventStatus, type SenderRole, type MessageSource,
} from "@/data/mockMessages";

// ─── Helpers ────────────────────────────────────────────────

function useIsMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}

function timeAgo(date: Date) {
    const mins = Math.round((Date.now() - date.getTime()) / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const roleColors: Record<SenderRole, string> = {
    user: "from-blue-500 to-cyan-500",
    agent: "from-purple-500 to-pink-500",
    system: "from-gray-500 to-gray-600",
};

const roleBadgeColors: Record<SenderRole, string> = {
    user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    agent: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    system: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const eventStatusConfig: Record<EventStatus, { icon: IconType; color: string; bg: string; label: string }> = {
    submitted: { icon: FiSend, color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30", label: "Submitted" },
    working: { icon: FiLoader, color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30", label: "Working" },
    completed: { icon: FiCheck, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30", label: "Completed" },
    failed: { icon: FiAlertCircle, color: "text-red-400", bg: "bg-red-500/20 border-red-500/30", label: "Failed" },
};

const artifactIcons: Record<ArtifactKind, { icon: IconType; color: string }> = {
    image: { icon: FiImage, color: "text-emerald-400" },
    video: { icon: FiVideo, color: "text-pink-400" },
    markdown: { icon: FiFileText, color: "text-blue-400" },
    mdx: { icon: FiFileText, color: "text-cyan-400" },
    typescript: { icon: FiCode, color: "text-blue-400" },
    javascript: { icon: FiCode, color: "text-yellow-400" },
};

const typeIcons: Record<MessageType, { icon: IconType; color: string }> = {
    text: { icon: FiMail, color: "text-gray-400" },
    event: { icon: FiClock, color: "text-amber-400" },
    progress: { icon: FiLoader, color: "text-cyan-400" },
    artifact: { icon: FiPaperclip, color: "text-emerald-400" },
};

const sourceConfig: Record<MessageSource, { icon: IconType; color: string; label: string }> = {
    github: { icon: FiGithub, color: "text-gray-300", label: "GitHub" },
    gitea: { icon: FiGitBranch, color: "text-green-400", label: "Gitea" },
    email: { icon: FiAtSign, color: "text-blue-400", label: "Email" },
    telegram: { icon: FiMessageCircle, color: "text-sky-400", label: "Telegram" },
    mattermost: { icon: FiHash, color: "text-blue-300", label: "Mattermost" },
};

// ─── Avatar component ───────────────────────────────────────

function Avatar({ name, role, size = "md" }: { name: string; role: SenderRole; size?: "sm" | "md" | "lg" }) {
    const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${roleColors[role]} flex items-center justify-center font-bold text-white shrink-0 shadow-lg`}>
            {initials}
        </div>
    );
}

// ─── Message Preview (list item) ────────────────────────────

function MessagePreview({ msg, mounted }: { msg: Message; mounted: boolean }) {
    const TypeIcon = typeIcons[msg.type].icon;
    const typeColor = typeIcons[msg.type].color;

    function renderPreviewContent() {
        switch (msg.type) {
            case "text":
                return <p className="text-xs text-gray-400 line-clamp-1">{msg.text}</p>;
            case "event": {
                const cfg = eventStatusConfig[msg.event!.status];
                const StatusIcon = cfg.icon;
                return (
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.bg}`}>
                            <StatusIcon className={`w-2.5 h-2.5 ${cfg.color} ${msg.event!.status === "working" ? "animate-spin" : ""}`} />
                            {cfg.label}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate">{msg.event!.taskName}</span>
                    </div>
                );
            }
            case "progress": {
                const pct = Math.round((msg.progress!.current / msg.progress!.total) * 100);
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500">{pct}%</span>
                    </div>
                );
            }
            case "artifact":
                return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {msg.artifacts!.slice(0, 3).map((a, i) => {
                            const AIcon = artifactIcons[a.kind].icon;
                            const aColor = artifactIcons[a.kind].color;
                            return (
                                <span key={i} className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded-md border border-white/5">
                                    <AIcon className={`w-2.5 h-2.5 ${aColor}`} />
                                    {a.name}
                                </span>
                            );
                        })}
                        {msg.artifacts!.length > 3 && (
                            <span className="text-[10px] text-gray-500">+{msg.artifacts!.length - 3}</span>
                        )}
                    </div>
                );
        }
    }

    return (
        <div className="flex items-start gap-3 w-full min-w-0">
            <Avatar name={msg.from.name} role={msg.from.role} size="sm" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-white truncate">{msg.from.name}</span>
                    <TypeIcon className={`w-3 h-3 ${typeColor} shrink-0`} />
                    {msg.source && (() => {
                        const src = sourceConfig[msg.source];
                        const SrcIcon = src.icon;
                        return <SrcIcon className={`w-3 h-3 ${src.color} shrink-0`} title={src.label} />;
                    })()}
                    <span className="text-[10px] text-gray-500 shrink-0 ml-auto">{mounted ? timeAgo(msg.timestamp) : ""}</span>
                </div>
                {msg.subject && <p className="text-[11px] text-gray-300 truncate mb-0.5">{msg.subject}</p>}
                {msg.project && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 mb-0.5">
                        <FiFolder className="w-2.5 h-2.5" />
                        {msg.project}
                    </span>
                )}
                {renderPreviewContent()}
            </div>
            {!msg.read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            )}
        </div>
    );
}

// ─── Message Detail (right pane) ────────────────────────────

function MessageDetail({ msg }: { msg: Message }) {
    return (
        <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 mb-3">
                    <Avatar name={msg.from.name} role={msg.from.role} size="lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{msg.from.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleBadgeColors[msg.from.role]}`}>
                                {msg.from.role}
                            </span>
                            {msg.source && (() => {
                                const src = sourceConfig[msg.source];
                                const SrcIcon = src.icon;
                                return (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-gray-800/50 text-gray-400">
                                        <SrcIcon className={`w-3 h-3 ${src.color}`} />
                                        {src.label}
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{msg.timestamp.toLocaleString()}</p>
                    </div>
                </div>
                {msg.subject && (
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white">{msg.subject}</h2>
                        {msg.project && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-gray-800/50 text-gray-400">
                                <FiFolder className="w-3 h-3 text-amber-400" />
                                {msg.project}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Text content */}
                {msg.text && (
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {msg.text.split(/(\*\*.*?\*\*)/).map((part, i) =>
                            part.startsWith("**") && part.endsWith("**")
                                ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                                : <span key={i}>{part}</span>
                        )}
                    </div>
                )}

                {/* Event content */}
                {msg.event && <EventCard event={msg.event} />}

                {/* Progress content */}
                {msg.progress && <ProgressCard progress={msg.progress} />}

                {/* Artifacts */}
                {msg.artifacts && msg.artifacts.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <FiPaperclip className="w-3.5 h-3.5" />
                            Artifacts ({msg.artifacts.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.artifacts.map((artifact, i) => (
                                <ArtifactCard key={i} artifact={artifact} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Sub-components ─────────────────────────────────────────

function EventCard({ event }: { event: Message["event"] }) {
    if (!event) return null;
    const cfg = eventStatusConfig[event.status];
    const StatusIcon = cfg.icon;

    return (
        <div className={`rounded-xl border p-4 ${cfg.bg}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${cfg.bg} border flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 ${cfg.color} ${event.status === "working" ? "animate-spin" : ""}`} />
                </div>
                <div>
                    <p className="text-sm font-bold text-white">{cfg.label}</p>
                    <p className="text-[10px] text-gray-400">Task {event.taskId}</p>
                </div>
            </div>
            <p className="text-xs font-medium text-gray-300 mb-1">{event.taskName}</p>
            {event.detail && <p className="text-xs text-gray-400">{event.detail}</p>}

            {/* Status timeline */}
            <div className="flex items-center gap-1 mt-4">
                {(["submitted", "working", "completed"] as EventStatus[]).map((step, i) => {
                    const stepIdx = ["submitted", "working", "completed", "failed"].indexOf(step);
                    const currentIdx = ["submitted", "working", "completed", "failed"].indexOf(event.status);
                    const isFailed = event.status === "failed";
                    const isActive = stepIdx <= currentIdx && !isFailed;
                    const isFailedStep = isFailed && stepIdx <= 1; // submitted + working before failure
                    return (
                        <div key={step} className="flex items-center flex-1">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px]
                                ${isActive ? cfg.bg : isFailedStep ? "bg-amber-500/10 border-amber-500/20" : "bg-gray-800 border-gray-700"}`}>
                                {isActive || isFailedStep ? (
                                    <FiCheck className={`w-3 h-3 ${isActive ? cfg.color : "text-amber-400"}`} />
                                ) : (
                                    <span className="text-gray-600">{i + 1}</span>
                                )}
                            </div>
                            {i < 2 && (
                                <div className={`flex-1 h-0.5 mx-1 rounded ${isActive && stepIdx < currentIdx ? "bg-current opacity-30" : "bg-gray-700"}`}
                                    style={isActive && stepIdx < currentIdx ? { color: cfg.color.replace("text-", "") } : undefined}
                                />
                            )}
                        </div>
                    );
                })}
                {event.status === "failed" && (
                    <div className="flex items-center flex-1">
                        <div className="flex-1 h-0.5 mx-1 rounded bg-gray-700" />
                        <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                            <FiAlertCircle className="w-3 h-3 text-red-400" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProgressCard({ progress }: { progress: Message["progress"] }) {
    if (!progress) return null;
    const pct = Math.round((progress.current / progress.total) * 100);
    const isComplete = progress.current >= progress.total;

    return (
        <div className="rounded-xl border border-white/10 bg-gray-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-300">{progress.label}</span>
                <span className={`text-xs font-bold ${isComplete ? "text-emerald-400" : "text-cyan-400"}`}>{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${isComplete ? "bg-gradient-to-r from-emerald-500 to-green-400" : "bg-gradient-to-r from-cyan-500 to-blue-500"}`}
                />
            </div>
            <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-500">{progress.current} / {progress.total}</span>
                {isComplete && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <FiCheck className="w-3 h-3" /> Complete
                    </span>
                )}
            </div>
        </div>
    );
}

function ArtifactCard({ artifact }: { artifact: NonNullable<Message["artifacts"]>[number] }) {
    const { icon: AIcon, color } = artifactIcons[artifact.kind];

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            className="group rounded-xl border border-white/10 bg-gray-800/50 hover:bg-gray-800/80 hover:border-white/20 p-3 transition-colors cursor-pointer"
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gray-900/80 border border-white/5 flex items-center justify-center shrink-0`}>
                    <AIcon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate group-hover:text-blue-300 transition-colors">{artifact.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{artifact.kind.toUpperCase()} · {artifact.size}</p>
                </div>
                <FiArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 transition-colors mt-1 shrink-0" />
            </div>
            {artifact.preview && (
                <p className="text-[10px] text-gray-500 mt-2 line-clamp-2 pl-[52px]">{artifact.preview}</p>
            )}
        </motion.div>
    );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyDetail() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center">
                <FiMail className="w-7 h-7 text-gray-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-400">Select a message</h3>
            <p className="text-xs text-gray-600 max-w-[200px]">Choose a message from the list to view its contents here.</p>
        </div>
    );
}

// ─── Filter Tabs ────────────────────────────────────────────

type FilterTab = "all" | MessageType;

const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "text", label: "Messages" },
    { key: "event", label: "Events" },
    { key: "progress", label: "Progress" },
    { key: "artifact", label: "Artifacts" },
];

// ─── Main Page ──────────────────────────────────────────────

export default function MessagesPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterTab>("all");
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const mounted = useIsMounted();

    const unreadCount = useMemo(() => getUnreadCount(), []);

    const filteredMessages = useMemo(() =>
        filter === "all" ? mockMessages : mockMessages.filter(m => m.type === filter)
        , [filter]);

    const selectedMessage = useMemo(() =>
        mockMessages.find(m => m.id === selectedId) ?? null
        , [selectedId]);

    const handleSelectMessage = (msg: Message) => {
        setSelectedId(msg.id);
        setMobileDetailOpen(true);
    };

    return (
        <main className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col overflow-hidden">
            {/* Filter tabs */}
            <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-white/10">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer
                                ${filter === tab.key
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split pane */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Message list (left pane) */}
                <div className={`flex flex-col min-h-0 border-r border-white/10 overflow-hidden
                    ${mobileDetailOpen ? "hidden md:flex" : "flex"}
                    w-full md:w-[380px] md:min-w-[320px] md:max-w-[480px] shrink-0`}
                >
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={filter}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                {filteredMessages.map((msg, i) => (
                                    <motion.button
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03, duration: 0.2 }}
                                        onClick={() => handleSelectMessage(msg)}
                                        className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-colors cursor-pointer
                                            ${selectedId === msg.id
                                                ? "bg-blue-600/10 border-l-2 border-l-blue-500"
                                                : "hover:bg-gray-800/50 border-l-2 border-l-transparent"
                                            }
                                            ${!msg.read ? "bg-gray-800/30" : ""}`}
                                    >
                                        <MessagePreview msg={msg} mounted={mounted} />
                                    </motion.button>
                                ))}
                            </motion.div>
                        </AnimatePresence>

                        {filteredMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <FiMail className="w-8 h-8 text-gray-700 mb-3" />
                                <p className="text-xs text-gray-500">No messages of this type</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Message detail (right pane) */}
                <div className={`flex-1 min-w-0 bg-gray-900/50
                    ${mobileDetailOpen ? "flex flex-col" : "hidden md:flex md:flex-col"}`}
                >
                    {/* Mobile back button */}
                    {mobileDetailOpen && (
                        <button
                            onClick={() => setMobileDetailOpen(false)}
                            className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                            <span className="text-xs font-medium">Back to messages</span>
                        </button>
                    )}

                    <AnimatePresence mode="wait">
                        {selectedMessage ? (
                            <MessageDetail msg={selectedMessage} />
                        ) : (
                            <EmptyDetail />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
