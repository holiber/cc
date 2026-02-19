"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WorkflowGraph, { WorkflowStep } from "@/components/WorkflowGraph";

// Complex experiment workflow with branching, parallel, and looping
const EXPERIMENT_STEPS: WorkflowStep[] = [
    // Entry point
    { id: "start", label: "Start", status: "planned" },

    // Initial fetch
    { id: "fetch", label: "Fetch Data", status: "planned" },

    // Branch/Condition
    { id: "condition", label: "Check Type", status: "planned" },

    // Parallel branches
    { id: "branch-a", label: "Process A", status: "planned" },
    { id: "branch-b", label: "Process B", status: "planned" },

    // Merge point
    { id: "merge", label: "Merge Results", status: "planned" },

    // Loop section
    { id: "loop-start", label: "Validate", status: "planned", iteration: 0, hasLeftHandle: true },
    { id: "transform", label: "Transform", status: "planned" },
    { id: "loop-end", label: "Check Done", status: "planned", hasRightHandle: true },

    // Final
    { id: "complete", label: "Complete", status: "planned" },
];

const PARALLEL_GROUPS = [["branch-a", "branch-b"]];

type VisualStyle = "gradient" | "glow" | "ios" | "minimal";

export default function ExperimentsPage() {
    const [steps, setSteps] = useState<WorkflowStep[]>(EXPERIMENT_STEPS);
    const [isRunning, setIsRunning] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [visualStyle, setVisualStyle] = useState<VisualStyle>("gradient");
    const [currentPhase, setCurrentPhase] = useState<string>("idle");

    const resetWorkflow = useCallback(() => {
        setSteps(EXPERIMENT_STEPS.map(s => ({
            ...s,
            status: "planned",
            iteration: s.id === "loop-start" ? 0 : s.iteration
        })));
        setIsRunning(false);
        setIsLooping(false);
        setCurrentPhase("idle");
    }, []);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const runExperiment = async () => {
        setIsRunning(true);
        resetWorkflow();
        await delay(100);

        // Phase 1: Start
        setCurrentPhase("Starting workflow");
        updateStep("start", { status: "in_progress" });
        await delay(400);
        updateStep("start", { status: "done" });

        // Phase 2: Fetch
        setCurrentPhase("Fetching data");
        updateStep("fetch", { status: "in_progress" });
        await delay(500);
        updateStep("fetch", { status: "done" });

        // Phase 3: Condition check
        setCurrentPhase("Checking condition");
        updateStep("condition", { status: "in_progress" });
        await delay(400);
        updateStep("condition", { status: "done" });

        // Phase 4: Parallel execution
        setCurrentPhase("Running parallel branches");
        updateStep("branch-a", { status: "in_progress" });
        updateStep("branch-b", { status: "in_progress" });
        await delay(600);
        updateStep("branch-a", { status: "done" });
        await delay(200);
        updateStep("branch-b", { status: "done" });

        // Phase 5: Merge
        setCurrentPhase("Merging results");
        updateStep("merge", { status: "in_progress" });
        await delay(400);
        updateStep("merge", { status: "done" });

        // Phase 6: Loop
        const maxIterations = 3;
        for (let i = 1; i <= maxIterations; i++) {
            setCurrentPhase(`Loop iteration ${i}/${maxIterations}`);
            setIsLooping(true);

            // Validate (loop-start)
            updateStep("loop-start", { status: "in_progress", iteration: i });
            await delay(350);
            updateStep("loop-start", { status: "done", iteration: i });

            // Transform
            updateStep("transform", { status: "in_progress" });
            await delay(350);
            updateStep("transform", { status: "done" });

            // Check Done (loop-end)
            updateStep("loop-end", { status: "in_progress" });
            await delay(300);

            if (i < maxIterations) {
                // Reset for next iteration
                updateStep("loop-end", { status: "planned" });
                updateStep("transform", { status: "planned" });
                updateStep("loop-start", { status: "planned", iteration: i });
            } else {
                updateStep("loop-end", { status: "done" });
            }
        }

        setIsLooping(false);

        // Phase 7: Complete
        setCurrentPhase("Completing");
        updateStep("complete", { status: "in_progress" });
        await delay(400);
        updateStep("complete", { status: "done" });

        setCurrentPhase("Done!");
        setIsRunning(false);
    };

    return (
        <main className="min-h-screen p-6 bg-gray-950">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto"
            >
                <h1 className="text-2xl font-bold mb-1 text-center text-white">
                    Visual Experiments
                </h1>
                <p className="text-gray-400 text-center mb-6 text-sm">
                    Complex workflow with branching, parallel execution, and looping
                </p>

                {/* Visual style selector */}
                <div className="flex flex-wrap gap-3 mb-6 justify-center">
                    <div className="flex gap-1.5 bg-gray-800/50 p-1 rounded-lg">
                        {(["gradient", "glow", "ios", "minimal"] as VisualStyle[]).map((style) => (
                            <button
                                key={style}
                                onClick={() => setVisualStyle(style)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${visualStyle === style
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                                    }`}
                            >
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={runExperiment}
                            disabled={isRunning}
                            className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                            {isRunning ? "Running..." : "Run Experiment"}
                        </button>
                        <button
                            onClick={resetWorkflow}
                            disabled={isRunning}
                            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg text-sm transition-all"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Current phase indicator */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhase}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="text-center mb-4"
                    >
                        <span className={`text-sm px-3 py-1 rounded-full ${currentPhase === "idle" ? "bg-gray-700 text-gray-400" :
                                currentPhase === "Done!" ? "bg-emerald-600/30 text-emerald-400" :
                                    "bg-blue-600/30 text-blue-400"
                            }`}>
                            {currentPhase === "idle" ? "Ready to run" : currentPhase}
                        </span>
                    </motion.div>
                </AnimatePresence>

                {/* Workflow graph */}
                <WorkflowGraph
                    steps={steps.map(s => ({ ...s, visualStyle }))}
                    layout="loop"
                    parallelGroups={PARALLEL_GROUPS}
                    isLooping={isLooping}
                />

                {/* Legend */}
                <div className="mt-4 flex justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-600"></div>
                        <span className="text-gray-400">Waiting</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500 animate-pulse"></div>
                        <span className="text-gray-400">Running</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500"></div>
                        <span className="text-gray-400">Done</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <span className="text-gray-400">Has Run</span>
                    </div>
                </div>

                {/* Icon preview */}
                <div className="mt-8 text-center">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Generated Icon Set</h3>
                    <img
                        src="/icons/workflow_icons.png"
                        alt="Workflow Icons"
                        className="mx-auto max-w-md rounded-lg border border-gray-700"
                    />
                </div>
            </motion.div>
        </main>
    );
}
