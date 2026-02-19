"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// Tech stack icons - 6 columns x 5 rows = 30 icons
const TECH_ICONS = [
    // Row 1
    ["React", "TypeScript", "JavaScript", "Node.js", "Python", "Go"],
    // Row 2
    ["Docker", "Kubernetes", "PostgreSQL", "MongoDB", "Redis", "GraphQL"],
    // Row 3
    ["Vue.js", "Angular", "Next.js", "Vite", "Webpack", "ESLint"],
    // Row 4
    ["Git", "GitHub", "GitLab", "Bash", "Linux", "macOS"],
    // Row 5
    ["AWS", "Google Cloud", "Azure", "Vercel", "Cloudflare", "n8n"],
];

const COLS = 6;
const ROWS = 5;

export default function TechPage() {
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [filter, setFilter] = useState("");

    const allIcons = TECH_ICONS.flat();
    const filteredIcons = filter
        ? allIcons.filter(icon => icon.toLowerCase().includes(filter.toLowerCase()))
        : allIcons;

    return (
        <main className="min-h-screen p-6 bg-gray-950">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto"
            >
                <h1 className="text-2xl font-bold mb-1 text-center text-white">
                    Tech Stack Icons
                </h1>
                <p className="text-gray-400 text-center mb-6 text-sm">
                    30 brand-colored developer tool icons
                </p>

                {/* Search filter */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search icons..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full max-w-md mx-auto block px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Selected icon display */}
                {selectedIcon && (
                    <div className="text-center mb-4">
                        <span className="text-sm text-gray-400">Selected: </span>
                        <span className="text-sm text-white font-medium">{selectedIcon}</span>
                    </div>
                )}

                {/* Full spritesheet with individual colored icons */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 mb-6">
                    <h3 className="text-white font-medium mb-4 text-sm">Full Icon Set (Brand Colors)</h3>
                    <img
                        src="/icons/tech_stack.png"
                        alt="Tech Stack Icons"
                        className="w-full max-w-lg rounded-lg mx-auto"
                    />
                </div>

                {/* Icon grid with names */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                    <h3 className="text-white font-medium mb-4 text-sm">Icon Reference</h3>
                    <div className="grid grid-cols-6 gap-3">
                        {TECH_ICONS.flat().map((name, index) => {
                            const row = Math.floor(index / COLS);
                            const col = index % COLS;
                            const isFiltered = filter && !name.toLowerCase().includes(filter.toLowerCase());

                            return (
                                <motion.div
                                    key={name}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setSelectedIcon(name)}
                                    className={`
                    relative aspect-square bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer 
                    transition-all border-2
                    ${selectedIcon === name ? "border-blue-500" : "border-transparent hover:border-gray-600"}
                    ${isFiltered ? "opacity-20" : ""}
                  `}
                                >
                                    {/* Icon from spritesheet */}
                                    <div
                                        className="w-full h-full p-2"
                                        style={{
                                            backgroundImage: "url('/icons/tech_stack.png')",
                                            backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                                            backgroundPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`,
                                        }}
                                    />
                                    {/* Name tooltip */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1">
                                        <span className="text-[9px] text-white">{name}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Usage info */}
                <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-700/50">
                    <h3 className="text-blue-400 font-medium mb-2 text-sm">💡 Usage</h3>
                    <p className="text-gray-400 text-sm">
                        These icons use their original brand colors. For monochrome versions with CSS filter coloring,
                        check the <a href="/experiments/library" className="text-blue-400 underline">Icon Library</a> page.
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
