"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
    FiPlay, FiCheck, FiRefreshCw, FiDatabase, FiCpu, FiSend,
    FiZap, FiLoader, FiBox
} from "react-icons/fi";
import {
    HiOutlineSparkles, HiOutlineCog, HiOutlineRefresh,
    HiOutlineDatabase, HiOutlinePlay, HiOutlineCheckCircle
} from "react-icons/hi";

export type WorkflowNodeStatus = "planned" | "in_progress" | "done";

export interface WorkflowNodeData {
    label: string;
    status: WorkflowNodeStatus;
    iteration?: number;
    hasLeftHandle?: boolean;
    hasRightHandle?: boolean;
    hasRun?: boolean; // Has this node ever run?
    icon?: string;
    visualStyle?: "default" | "gradient" | "glow" | "ios" | "minimal";
}

// Icon mapping for different node types
const iconMap: Record<string, React.ReactNode> = {
    "initialize": <FiPlay className="w-4 h-4" />,
    "fetch": <FiDatabase className="w-4 h-4" />,
    "process": <FiCpu className="w-4 h-4" />,
    "update": <FiSend className="w-4 h-4" />,
    "complete": <FiCheck className="w-4 h-4" />,
    "loop": <FiRefreshCw className="w-4 h-4" />,
    "start": <HiOutlinePlay className="w-4 h-4" />,
    "end": <HiOutlineCheckCircle className="w-4 h-4" />,
    "default": <FiBox className="w-4 h-4" />,
};

const statusColors: Record<WorkflowNodeStatus, string> = {
    planned: "from-gray-600 to-gray-700",
    in_progress: "from-blue-500 to-blue-600",
    done: "from-emerald-500 to-emerald-600",
};

const statusBgColors: Record<WorkflowNodeStatus, string> = {
    planned: "bg-gray-600",
    in_progress: "bg-blue-500",
    done: "bg-emerald-500",
};

const statusLabels: Record<WorkflowNodeStatus, string> = {
    planned: "Waiting",
    in_progress: "Running",
    done: "Done",
};

function getIcon(label: string): React.ReactNode {
    const key = label.toLowerCase();
    if (key.includes("init")) return iconMap["initialize"];
    if (key.includes("fetch")) return iconMap["fetch"];
    if (key.includes("process")) return iconMap["process"];
    if (key.includes("update") || key.includes("send")) return iconMap["update"];
    if (key.includes("complete") || key.includes("end")) return iconMap["complete"];
    if (key.includes("loop") || key.includes("start")) return iconMap["loop"];
    return iconMap["default"];
}

function WorkflowNode({ data }: NodeProps) {
    const nodeData = data as unknown as WorkflowNodeData;
    const {
        label,
        status,
        iteration,
        hasLeftHandle,
        hasRightHandle,
        hasRun,
        visualStyle = "gradient"
    } = nodeData;

    const icon = getIcon(label);
    const isActive = status === "in_progress";
    const wasRun = hasRun || status === "done";

    // Different visual styles
    const getNodeStyles = () => {
        switch (visualStyle) {
            case "gradient":
                return `bg-gradient-to-br ${statusColors[status]} border border-white/10`;
            case "glow":
                return `${statusBgColors[status]} ${isActive ? "shadow-[0_0_20px_rgba(96,165,250,0.5)]" : ""} border border-white/20`;
            case "ios":
                return `${statusBgColors[status]} backdrop-blur-sm bg-opacity-90 border border-white/30 rounded-xl`;
            case "minimal":
                return `bg-gray-800 border-2 ${status === "done" ? "border-emerald-400" : status === "in_progress" ? "border-blue-400" : "border-gray-600"}`;
            default:
                return `${statusBgColors[status]} border border-gray-600`;
        }
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
            }}
            transition={{ duration: 0.2 }}
            className={`
        relative px-3 py-2 rounded-lg shadow-lg min-w-[90px]
        ${getNodeStyles()}
        ${isActive ? "ring-2 ring-blue-400/50 ring-offset-2 ring-offset-gray-900" : ""}
      `}
            data-testid={`node-${label.toLowerCase().replace(/\s+/g, "-")}`}
            data-status={status}
        >
            {/* Animated border for running state */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{
                        background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent)",
                        backgroundSize: "200% 100%",
                    }}
                    animate={{
                        backgroundPosition: ["0% 0%", "200% 0%"],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            )}

            {/* "Has run" indicator dot */}
            {wasRun && status !== "in_progress" && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-gray-900" />
            )}

            {/* Handles - invisible but functional */}
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                className="!bg-transparent !border-0 !w-4 !h-2"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                className="!bg-transparent !border-0 !w-4 !h-2"
            />
            {hasLeftHandle && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="left"
                    className="!bg-transparent !border-0 !w-2 !h-4"
                />
            )}
            {hasRightHandle && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="right"
                    className="!bg-transparent !border-0 !w-2 !h-4"
                />
            )}

            {/* Content */}
            <div className="relative z-10 flex items-center gap-2">
                {/* Icon */}
                <div className={`
          flex items-center justify-center w-6 h-6 rounded-md
          ${status === "in_progress" ? "bg-white/20" : "bg-black/20"}
        `}>
                    {isActive ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <FiLoader className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                    ) : (
                        <span className="text-white/90">{icon}</span>
                    )}
                </div>

                {/* Label and status */}
                <div>
                    <div className="font-medium text-white text-xs leading-tight">{label}</div>
                    <div className="text-[9px] text-white/60 leading-tight">
                        {statusLabels[status]}
                        {iteration !== undefined && iteration > 0 && ` #${iteration}`}
                    </div>
                </div>
            </div>

            {/* Running progress bar */}
            {isActive && (
                <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 rounded-b-lg overflow-hidden"
                >
                    <motion.div
                        className="h-full bg-white/70"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </motion.div>
            )}
        </motion.div>
    );
}

export default memo(WorkflowNode);
