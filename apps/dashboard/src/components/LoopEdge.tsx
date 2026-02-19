"use client";

import { memo } from "react";
import { EdgeProps } from "@xyflow/react";

interface LoopEdgeData {
    isLooping?: boolean;
}

function LoopEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
}: EdgeProps) {
    const edgeData = data as LoopEdgeData | undefined;
    const isLooping = edgeData?.isLooping ?? false;

    // Create a smooth curved path from right side of source to left side of target
    const loopRadius = 50;
    const leftOffset = Math.min(sourceX, targetX) - loopRadius;

    const path = `
    M ${sourceX} ${sourceY}
    C ${sourceX + 15} ${sourceY},
      ${leftOffset} ${sourceY},
      ${leftOffset} ${(sourceY + targetY) / 2}
    C ${leftOffset} ${targetY},
      ${targetX - 15} ${targetY},
      ${targetX} ${targetY}
  `;

    return (
        <g>
            {/* Shadow */}
            <path
                d={path}
                fill="none"
                stroke="#1a1a2e"
                strokeWidth={5}
                strokeLinecap="round"
            />

            {/* Main path with highlight transition */}
            <path
                id={id}
                d={path}
                fill="none"
                stroke={isLooping ? "#60a5fa" : "#4b5563"}
                strokeWidth={isLooping ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray={isLooping ? "none" : "4,4"}
                style={{
                    transition: "stroke 0.3s ease, stroke-width 0.3s ease",
                    filter: isLooping ? "drop-shadow(0 0 6px #60a5fa)" : "none",
                }}
            />

            {/* Arrow indicator */}
            <polygon
                points={`${targetX},${targetY} ${targetX - 6},${targetY - 3} ${targetX - 6},${targetY + 3}`}
                fill={isLooping ? "#60a5fa" : "#4b5563"}
                style={{ transition: "fill 0.3s ease" }}
            />

            {/* Loop label */}
            <text
                x={leftOffset - 6}
                y={(sourceY + targetY) / 2}
                textAnchor="end"
                dominantBaseline="middle"
                style={{
                    fontSize: 10,
                    fill: isLooping ? "#60a5fa" : "#6b7280",
                    transition: "fill 0.3s ease",
                }}
            >
                ↻
            </text>
        </g>
    );
}

export default memo(LoopEdge);
