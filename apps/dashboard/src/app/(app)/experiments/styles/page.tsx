"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    FiPlay, FiDatabase, FiCpu, FiCheck, FiLoader, FiRefreshCw
} from "react-icons/fi";

type VisualStyle = "gradient" | "glow" | "ios" | "minimal" | "glass" | "neon";

const DEMO_NODES = [
    { label: "Start", status: "done", icon: FiPlay },
    { label: "Process", status: "in_progress", icon: FiCpu },
    { label: "Database", status: "planned", icon: FiDatabase },
    { label: "Complete", status: "done", icon: FiCheck },
];

const styleConfigs: Record<VisualStyle, {
    name: string;
    description: string;
    planned: string;
    running: string;
    done: string;
}> = {
    gradient: {
        name: "Gradient",
        description: "Smooth color gradients with depth",
        planned: "bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-600",
        running: "bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400 shadow-lg shadow-blue-500/30",
        done: "bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400",
    },
    glow: {
        name: "Glow",
        description: "Vibrant neon glow effects",
        planned: "bg-gray-800 border-2 border-gray-600",
        running: "bg-blue-600 border-2 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)]",
        done: "bg-emerald-600 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    },
    ios: {
        name: "iOS",
        description: "Apple-style glassmorphism",
        planned: "bg-gray-700/60 backdrop-blur-md border border-white/20 rounded-2xl",
        running: "bg-blue-500/70 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg",
        done: "bg-emerald-500/70 backdrop-blur-md border border-white/30 rounded-2xl",
    },
    minimal: {
        name: "Minimal",
        description: "Clean flat design with focus",
        planned: "bg-gray-900 border-2 border-gray-700 rounded-sm",
        running: "bg-gray-900 border-2 border-blue-500 rounded-sm",
        done: "bg-gray-900 border-2 border-emerald-500 rounded-sm",
    },
    glass: {
        name: "Glass",
        description: "Frosted glass with blur",
        planned: "bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl",
        running: "bg-blue-500/20 backdrop-blur-xl border border-blue-400/40 shadow-xl shadow-blue-500/20",
        done: "bg-emerald-500/20 backdrop-blur-xl border border-emerald-400/40 shadow-xl",
    },
    neon: {
        name: "Neon",
        description: "Cyberpunk neon outlines",
        planned: "bg-black border-2 border-gray-600",
        running: "bg-black border-2 border-cyan-400 shadow-[0_0_20px_#22d3ee,inset_0_0_20px_rgba(34,211,238,0.1)]",
        done: "bg-black border-2 border-pink-500 shadow-[0_0_20px_#ec4899,inset_0_0_20px_rgba(236,72,153,0.1)]",
    },
};

function DemoNode({
    label,
    status,
    icon: Icon,
    style
}: {
    label: string;
    status: string;
    icon: typeof FiPlay;
    style: VisualStyle;
}) {
    const config = styleConfigs[style];
    const styleClass = status === "done" ? config.done :
        status === "in_progress" ? config.running :
            config.planned;
    const isRunning = status === "in_progress";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
        relative px-3 py-2 rounded-lg min-w-[90px] transition-all duration-300
        ${styleClass}
      `}
        >
            {/* Running animation overlay */}
            {isRunning && style === "neon" && (
                <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-cyan-400"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
            )}

            <div className="relative z-10 flex items-center gap-2">
                <div className={`
          flex items-center justify-center w-6 h-6 rounded-md
          ${status === "in_progress" ? "bg-white/20" : "bg-black/20"}
        `}>
                    {isRunning ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <FiLoader className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                    ) : (
                        <Icon className="w-3.5 h-3.5 text-white/90" />
                    )}
                </div>
                <div>
                    <div className="font-medium text-white text-xs">{label}</div>
                    <div className="text-[9px] text-white/60">
                        {status === "done" ? "Done" : status === "in_progress" ? "Running" : "Waiting"}
                    </div>
                </div>
            </div>

            {/* Running progress bar */}
            {isRunning && (
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 rounded-b-lg overflow-hidden">
                    <motion.div
                        className="h-full bg-white/60"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </motion.div>
            )}
        </motion.div>
    );
}

export default function StylesPage() {
    const [activeStyle, setActiveStyle] = useState<VisualStyle>("gradient");

    return (
        <main className="min-h-screen p-6 bg-gray-950">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto"
            >
                <h1 className="text-2xl font-bold mb-1 text-center text-white">
                    Visual Styles Comparison
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    Compare different node styling approaches
                </p>

                {/* All styles grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {(Object.keys(styleConfigs) as VisualStyle[]).map((style) => (
                        <div
                            key={style}
                            className={`
                p-4 rounded-xl bg-gray-900/50 border transition-all cursor-pointer
                ${activeStyle === style ? "border-blue-500 ring-2 ring-blue-500/30" : "border-gray-700 hover:border-gray-600"}
              `}
                            onClick={() => setActiveStyle(style)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white font-medium">{styleConfigs[style].name}</h3>
                                {activeStyle === style && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded">Active</span>
                                )}
                            </div>
                            <p className="text-gray-500 text-xs mb-4">{styleConfigs[style].description}</p>

                            {/* Demo nodes */}
                            <div className="flex flex-wrap gap-2">
                                {DEMO_NODES.map((node, i) => (
                                    <DemoNode key={i} {...node} style={style} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bleeding Edge UI Ideas */}
                <div className="mt-12 p-6 bg-gray-900/50 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-bold text-white mb-4">🚀 Bleeding Edge UI Ideas</h2>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <h3 className="text-blue-400 font-medium mb-1">3D Perspective Nodes</h3>
                            <p className="text-gray-400 text-xs">CSS 3D transforms for depth, tilt on hover, parallax effects</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <h3 className="text-purple-400 font-medium mb-1">Particle Effects</h3>
                            <p className="text-gray-400 text-xs">Canvas particles on state transitions, spark effects on completion</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <h3 className="text-pink-400 font-medium mb-1">Morphing Shapes</h3>
                            <p className="text-gray-400 text-xs">SVG path morphing between states, organic blob animations</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <h3 className="text-cyan-400 font-medium mb-1">Audio Feedback</h3>
                            <p className="text-gray-400 text-xs">Subtle sounds on transitions, completion chimes, error buzzes</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <h3 className="text-emerald-400 font-medium mb-1">Lottie Animations</h3>
                            <p className="text-gray-400 text-xs">High-quality vector animations for icons and transitions</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <h3 className="text-orange-400 font-medium mb-1">WebGL Shaders</h3>
                            <p className="text-gray-400 text-xs">Custom shader effects for backgrounds, liquid simulations</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
