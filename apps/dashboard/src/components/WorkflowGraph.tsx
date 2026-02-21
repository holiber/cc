"use client";

import { useEffect, useMemo } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
} from "@xyflow/react";
import WorkflowNode, { WorkflowNodeStatus } from "./WorkflowNode";
import AnimatedEdge from "./AnimatedEdge";
import LoopEdge from "./LoopEdge";

const nodeTypes = { workflow: WorkflowNode };
const edgeTypes = {
    animated: AnimatedEdge,
    loop: LoopEdge,
};

export interface WorkflowStep {
    id: string;
    label: string;
    status: WorkflowNodeStatus;
    iteration?: number;
    hasLeftHandle?: boolean;
    hasRightHandle?: boolean;
}

export interface WorkflowGraphProps {
    steps: WorkflowStep[];
    layout?: "linear" | "parallel" | "loop";
    parallelGroups?: string[][];
    isLooping?: boolean;
    activeStepId?: string;
}

function createLinearLayout(steps: WorkflowStep[], activeStepId?: string): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = steps.map((step, index) => ({
        id: step.id,
        type: "workflow",
        position: { x: 200, y: index * 80 },
        data: {
            label: step.label,
            status: step.status,
            iteration: step.iteration,
        } as Record<string, unknown>,
    }));

    const edges: Edge[] = steps.slice(1).map((step, index) => ({
        id: `e-${steps[index].id}-${step.id}`,
        source: steps[index].id,
        target: step.id,
        type: "animated",
        data: { isActive: steps[index].status === "in_progress" } as Record<string, unknown>,
    }));

    return { nodes, edges };
}

function createParallelLayout(
    steps: WorkflowStep[],
    parallelGroups: string[][] = [],
    activeStepId?: string
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yPos = 0;

    const processed = new Set<string>();

    for (const step of steps) {
        if (processed.has(step.id)) continue;

        const parallelGroup = parallelGroups.find((g) => g.includes(step.id));

        if (parallelGroup && parallelGroup.length > 1) {
            const groupSteps = parallelGroup.map((id) => steps.find((s) => s.id === id)!).filter(Boolean);
            const startX = 200 - ((groupSteps.length - 1) * 80);

            groupSteps.forEach((s, i) => {
                nodes.push({
                    id: s.id,
                    type: "workflow",
                    position: { x: startX + i * 160, y: yPos },
                    data: { label: s.label, status: s.status } as Record<string, unknown>,
                });
                processed.add(s.id);
            });
            yPos += 80;
        } else {
            nodes.push({
                id: step.id,
                type: "workflow",
                position: { x: 200, y: yPos },
                data: { label: step.label, status: step.status } as Record<string, unknown>,
            });
            processed.add(step.id);
            yPos += 80;
        }
    }

    for (let i = 1; i < steps.length; i++) {
        const prevStep = steps[i - 1];
        const currStep = steps[i];
        const prevGroup = parallelGroups.find((g) => g.includes(prevStep.id));
        const currGroup = parallelGroups.find((g) => g.includes(currStep.id));

        if (prevGroup && prevGroup.length > 1 && !prevGroup.includes(currStep.id)) {
            prevGroup.forEach((id) => {
                edges.push({
                    id: `e-${id}-${currStep.id}`,
                    source: id,
                    target: currStep.id,
                    type: "animated",
                    data: { isActive: steps.find((s) => s.id === id)?.status === "in_progress" } as Record<string, unknown>,
                });
            });
        } else if (!prevGroup || prevGroup.includes(currStep.id)) {
            if (!currGroup || !currGroup.includes(prevStep.id)) {
                edges.push({
                    id: `e-${prevStep.id}-${currStep.id}`,
                    source: prevStep.id,
                    target: currStep.id,
                    type: "animated",
                    data: { isActive: prevStep.status === "in_progress" } as Record<string, unknown>,
                });
            }
        }
    }

    return { nodes, edges };
}

function createLoopLayout(steps: WorkflowStep[], isLooping: boolean): { nodes: Node[]; edges: Edge[] } {
    // Find the loop start and end indices
    const loopStartIdx = steps.findIndex(s => s.id === "loop-start");
    const loopEndIdx = steps.findIndex(s => s.id === "loop-end");

    const nodes: Node[] = steps.map((step, index) => ({
        id: step.id,
        type: "workflow",
        position: { x: 250, y: index * 70 },
        data: {
            label: step.label,
            status: step.status,
            iteration: step.iteration,
            hasLeftHandle: step.hasLeftHandle,
            hasRightHandle: step.hasRightHandle,
        } as Record<string, unknown>,
    }));

    const edges: Edge[] = [];

    // Create normal edges between sequential steps
    for (let i = 0; i < steps.length - 1; i++) {
        const source = steps[i];
        const target = steps[i + 1];

        if (source.id === "loop-end" && target.id === "done") {
            edges.push({
                id: `e-${source.id}-${target.id}`,
                source: source.id,
                target: target.id,
                type: "animated",
                label: "exit",
                labelStyle: { fill: "#888", fontSize: 9 },
                labelBgStyle: { fill: "#0f0f23" },
                data: { isActive: source.status === "in_progress" } as Record<string, unknown>,
            });
        } else {
            edges.push({
                id: `e-${source.id}-${target.id}`,
                source: source.id,
                target: target.id,
                type: "animated",
                data: { isActive: source.status === "in_progress" } as Record<string, unknown>,
            });
        }
    }

    // Add the loop-back edge from "loop-end" to "loop-start" using side handles
    if (loopStartIdx !== -1 && loopEndIdx !== -1) {
        edges.push({
            id: "e-loop-back",
            source: "loop-end",
            target: "loop-start",
            sourceHandle: "right",
            targetHandle: "left",
            type: "loop",
            data: { isLooping } as Record<string, unknown>,
        });
    }

    return { nodes, edges };
}

export default function WorkflowGraph({
    steps,
    layout = "linear",
    parallelGroups,
    isLooping = false,
    activeStepId,
}: WorkflowGraphProps) {
    const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
        if (layout === "loop") {
            return createLoopLayout(steps, isLooping);
        } else if (layout === "parallel" && parallelGroups) {
            return createParallelLayout(steps, parallelGroups, activeStepId);
        }
        return createLinearLayout(steps, activeStepId);
    }, [steps, layout, parallelGroups, isLooping, activeStepId]);

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

    useEffect(() => {
        setNodes(layoutNodes);
        setEdges(layoutEdges);
    }, [layoutNodes, layoutEdges]);

    return (
        <div className="w-full h-[500px] bg-gray-900/80 rounded-lg border border-gray-700/50" data-testid="workflow-graph">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#333" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
