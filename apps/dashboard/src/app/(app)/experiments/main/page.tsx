"use client";

import { useState, useEffect, useCallback } from "react";
import WorkflowGraph, { WorkflowStep } from "@/components/WorkflowGraph";
import { motion } from "framer-motion";

type WorkflowType = "linear" | "parallel" | "loop";

const INITIAL_LINEAR_STEPS: WorkflowStep[] = [
  { id: "step1", label: "Step 1", status: "planned" },
  { id: "step2", label: "Step 2", status: "planned" },
  { id: "step3", label: "Step 3", status: "planned" },
  { id: "step4", label: "Step 4", status: "planned" },
];

const INITIAL_PARALLEL_STEPS: WorkflowStep[] = [
  { id: "start", label: "Start", status: "planned" },
  { id: "parallel-a", label: "Branch A", status: "planned" },
  { id: "parallel-b", label: "Branch B", status: "planned" },
  { id: "end", label: "End", status: "planned" },
];

const PARALLEL_GROUPS = [["parallel-a", "parallel-b"]];

const INITIAL_LOOP_STEPS: WorkflowStep[] = [
  { id: "init", label: "Initialize", status: "planned" },
  { id: "loop-start", label: "Fetch Data", status: "planned", iteration: 0, hasLeftHandle: true },
  { id: "process", label: "Process", status: "planned" },
  { id: "loop-end", label: "Update", status: "planned", hasRightHandle: true },
  { id: "done", label: "Complete", status: "planned" },
];

export default function Home() {
  const [workflowType, setWorkflowType] = useState<WorkflowType>("linear");
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_LINEAR_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [isLooping, setIsLooping] = useState(false);

  const resetWorkflow = useCallback(() => {
    setIsRunning(false);
    setLoopCount(0);
    setIsLooping(false);
    switch (workflowType) {
      case "linear":
        setSteps(INITIAL_LINEAR_STEPS.map((s) => ({ ...s, status: "planned" })));
        break;
      case "parallel":
        setSteps(INITIAL_PARALLEL_STEPS.map((s) => ({ ...s, status: "planned" })));
        break;
      case "loop":
        setSteps(INITIAL_LOOP_STEPS.map((s) => ({
          ...s,
          status: "planned",
          iteration: s.id === "loop-start" ? 0 : undefined
        })));
        break;
    }
  }, [workflowType]);

  useEffect(() => {
    resetWorkflow();
  }, [workflowType, resetWorkflow]);

  const runLinearWorkflow = async () => {
    for (let i = 0; i < steps.length; i++) {
      setSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx === i ? "in_progress" : idx < i ? "done" : "planned",
        }))
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
    setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
  };

  const runParallelWorkflow = async () => {
    // Start
    setSteps((prev) => prev.map((s) => (s.id === "start" ? { ...s, status: "in_progress" } : s)));
    await new Promise((r) => setTimeout(r, 800));
    setSteps((prev) => prev.map((s) => (s.id === "start" ? { ...s, status: "done" } : s)));

    // Parallel branches
    setSteps((prev) =>
      prev.map((s) =>
        s.id === "parallel-a" || s.id === "parallel-b" ? { ...s, status: "in_progress" } : s
      )
    );
    await new Promise((r) => setTimeout(r, 1200));
    setSteps((prev) =>
      prev.map((s) =>
        s.id === "parallel-a" || s.id === "parallel-b" ? { ...s, status: "done" } : s
      )
    );

    // End
    setSteps((prev) => prev.map((s) => (s.id === "end" ? { ...s, status: "in_progress" } : s)));
    await new Promise((r) => setTimeout(r, 800));
    setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
  };

  const runLoopWorkflow = async () => {
    const maxIterations = 3;

    // Initialize
    setSteps((prev) => prev.map((s) => (s.id === "init" ? { ...s, status: "in_progress" } : s)));
    await new Promise((r) => setTimeout(r, 500));
    setSteps((prev) => prev.map((s) => (s.id === "init" ? { ...s, status: "done" } : s)));

    for (let i = 1; i <= maxIterations; i++) {
      setLoopCount(i);
      setIsLooping(true);

      // Fetch Data (loop-start)
      setSteps((prev) =>
        prev.map((s) =>
          s.id === "loop-start" ? { ...s, status: "in_progress", iteration: i } : s
        )
      );
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) =>
        prev.map((s) =>
          s.id === "loop-start" ? { ...s, status: "done", iteration: i } : s
        )
      );

      // Process
      setSteps((prev) =>
        prev.map((s) => (s.id === "process" ? { ...s, status: "in_progress" } : s))
      );
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) =>
        prev.map((s) => (s.id === "process" ? { ...s, status: "done" } : s))
      );

      // Update (loop-end)
      setSteps((prev) =>
        prev.map((s) => (s.id === "loop-end" ? { ...s, status: "in_progress" } : s))
      );
      await new Promise((r) => setTimeout(r, 400));

      if (i < maxIterations) {
        // Reset loop nodes for next iteration
        setSteps((prev) =>
          prev.map((s) => {
            if (s.id === "loop-end") return { ...s, status: "planned" };
            if (s.id === "process") return { ...s, status: "planned" };
            if (s.id === "loop-start") return { ...s, status: "planned", iteration: i };
            return s;
          })
        );
      } else {
        setSteps((prev) =>
          prev.map((s) => (s.id === "loop-end" ? { ...s, status: "done" } : s))
        );
      }
    }

    setIsLooping(false);

    // Complete
    setSteps((prev) => prev.map((s) => (s.id === "done" ? { ...s, status: "in_progress" } : s)));
    await new Promise((r) => setTimeout(r, 400));
    setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
  };

  const runWorkflow = async () => {
    setIsRunning(true);
    resetWorkflow();
    await new Promise((r) => setTimeout(r, 100));

    switch (workflowType) {
      case "linear":
        await runLinearWorkflow();
        break;
      case "parallel":
        await runParallelWorkflow();
        break;
      case "loop":
        await runLoopWorkflow();
        break;
    }

    setIsRunning(false);
  };

  return (
    <main className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-2 text-center">Workflow Visualizer</h1>
        <p className="text-gray-400 text-center mb-8">
          React Flow + Framer Motion • State Transitions Demo
        </p>

        <div className="flex flex-wrap gap-4 mb-6 justify-center">
          <div className="flex gap-2">
            {(["linear", "parallel", "loop"] as WorkflowType[]).map((type) => (
              <button
                key={type}
                onClick={() => setWorkflowType(type)}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${workflowType === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } disabled:opacity-50`}
                data-testid={`btn-${type}`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={runWorkflow}
              disabled={isRunning}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all"
              data-testid="btn-run"
            >
              {isRunning ? "Running..." : "Run Workflow"}
            </button>
            <button
              onClick={resetWorkflow}
              disabled={isRunning}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg transition-all"
              data-testid="btn-reset"
            >
              Reset
            </button>
          </div>
        </div>

        {workflowType === "loop" && loopCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-4 text-blue-400"
            data-testid="loop-counter"
          >
            Loop iteration: {loopCount} / 3
          </motion.div>
        )}

        <WorkflowGraph
          steps={steps}
          layout={workflowType}
          parallelGroups={workflowType === "parallel" ? PARALLEL_GROUPS : undefined}
          isLooping={isLooping}
        />

        <div className="mt-6 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-600"></div>
            <span className="text-gray-400">Planned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-600"></div>
            <span className="text-gray-400">Done</span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
