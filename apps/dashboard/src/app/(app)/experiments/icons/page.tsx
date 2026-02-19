"use client";

import { motion } from "framer-motion";
import {
    AnimatedHourglass,
    AnimatedSpinner,
    AnimatedDots,
    AnimatedPulse,
    AnimatedCheck,
    AnimatedDataFlow,
    AnimatedGear,
} from "@/components/AnimatedIcons";

const animatedIcons = [
    { name: "Hourglass", component: AnimatedHourglass, description: "Flipping hourglass timer" },
    { name: "Spinner", component: AnimatedSpinner, description: "Smooth circular spinner" },
    { name: "Loading Dots", component: AnimatedDots, description: "Bouncing dots pattern" },
    { name: "Pulse", component: AnimatedPulse, description: "Ripple pulse effect" },
    { name: "Check", component: AnimatedCheck, description: "Self-drawing checkmark" },
    { name: "Data Flow", component: AnimatedDataFlow, description: "Streaming data arrows" },
    { name: "Gear", component: AnimatedGear, description: "Rotating settings gear" },
];

const colors = [
    { name: "Blue", value: "#60a5fa" },
    { name: "Emerald", value: "#10b981" },
    { name: "Purple", value: "#a78bfa" },
    { name: "Pink", value: "#ec4899" },
    { name: "Orange", value: "#f97316" },
    { name: "Cyan", value: "#22d3ee" },
];

export default function IconsPage() {
    return (
        <main className="min-h-screen p-6 bg-gray-950">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto"
            >
                <h1 className="text-2xl font-bold mb-1 text-center text-white">
                    Animated Icons
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    CSS/SVG animated icons running at 60fps via Framer Motion
                </p>

                {/* Animated Icons Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
                    {animatedIcons.map((icon) => (
                        <div
                            key={icon.name}
                            className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 text-center"
                        >
                            <div className="flex justify-center mb-3">
                                <div className="w-16 h-16 flex items-center justify-center bg-gray-800 rounded-xl">
                                    <icon.component size={32} />
                                </div>
                            </div>
                            <h3 className="text-white font-medium text-sm">{icon.name}</h3>
                            <p className="text-gray-500 text-xs mt-1">{icon.description}</p>
                        </div>
                    ))}
                </div>

                {/* Color Variants */}
                <h2 className="text-lg font-bold text-white mb-4">Color Variants</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                    {colors.map((color) => (
                        <div
                            key={color.name}
                            className="p-4 bg-gray-900/50 rounded-xl border border-gray-700"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color.value }} />
                                <span className="text-white text-sm">{color.name}</span>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <AnimatedSpinner size={24} color={color.value} />
                                <AnimatedDots size={24} color={color.value} />
                                <AnimatedPulse size={24} color={color.value} />
                                <AnimatedGear size={24} color={color.value} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Size Variants */}
                <h2 className="text-lg font-bold text-white mb-4">Size Variants</h2>
                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 mb-12">
                    <div className="flex items-end justify-center gap-6">
                        {[16, 24, 32, 48, 64].map((size) => (
                            <div key={size} className="text-center">
                                <AnimatedSpinner size={size} />
                                <span className="text-gray-500 text-xs mt-2 block">{size}px</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Static Icon Set */}
                <h2 className="text-lg font-bold text-white mb-4">Generated Static Icon Set</h2>
                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <img
                        src="/icons/workflow_icons.png"
                        alt="Workflow Icons"
                        className="mx-auto max-w-lg rounded-lg"
                    />
                </div>

                {/* Note about frame sequences */}
                <div className="mt-8 p-4 bg-blue-900/20 rounded-xl border border-blue-700/50">
                    <h3 className="text-blue-400 font-medium mb-2">📝 About 30-60 FPS Animations</h3>
                    <p className="text-gray-400 text-sm">
                        These CSS/SVG animations run at native 60fps using Framer Motion. For frame-based
                        animations (like sprite sheets or GIFs), you would need to generate 30-60 individual
                        images per second of animation. The CSS approach is more efficient and produces
                        smoother results without file size overhead.
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
