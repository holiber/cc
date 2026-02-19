"use client";

import { memo } from "react";
import { EdgeProps, getSmoothStepPath, BaseEdge } from "@xyflow/react";

interface AnimatedEdgeData {
    isActive?: boolean;
}

function AnimatedEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    data,
}: EdgeProps) {
    const edgeData = data as AnimatedEdgeData | undefined;
    const isActive = edgeData?.isActive ?? false;

    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 8,
    });

    return (
        <g>
            {/* Shadow for depth */}
            <path
                d={edgePath}
                fill="none"
                stroke="#1a1a2e"
                strokeWidth={4}
                strokeLinecap="round"
            />

            {/* Main edge path with transition */}
            <path
                id={id}
                d={edgePath}
                fill="none"
                stroke={isActive ? "#60a5fa" : "#4b5563"}
                strokeWidth={isActive ? 3 : 2}
                strokeLinecap="round"
                style={{
                    transition: "stroke 0.3s ease, stroke-width 0.3s ease",
                    filter: isActive ? "drop-shadow(0 0 4px #60a5fa)" : "none",
                }}
                markerEnd={markerEnd}
            />
        </g>
    );
}

export default memo(AnimatedEdge);
