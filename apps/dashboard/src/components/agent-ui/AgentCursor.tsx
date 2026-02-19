import { motion } from "framer-motion";
import { StarBorder } from "./StarBorder";
import { ShinyText } from "./ShinyText";
import { WorkerAgent } from "./types";

export function AgentCursor({ agent }: { agent: WorkerAgent }) {
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
