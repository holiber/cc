import type { Meta, StoryObj } from "storybook-react-rsbuild";
import TodoList from "@/components/TodoList";
import type { TodoItem } from "@/types/agent";

const sampleTodos: TodoItem[] = [
    {
        id: "1", text: "Initialize Project", status: "done", assignee: "Admin",
        children: [
            { id: "1.1", text: "Create package.json", status: "done", assignee: "Worker" },
            { id: "1.2", text: "Setup TypeScript", status: "done", assignee: "Worker" },
        ]
    },
    {
        id: "2", text: "Build API Layer", status: "in_progress", assignee: "Orchestrator",
        children: [
            { id: "2.1", text: "Create API schema", status: "in_progress", assignee: "Worker" },
            { id: "2.2", text: "Implement endpoints", status: "pending", assignee: "Worker" },
        ]
    },
    {
        id: "3", text: "Create Components", status: "pending",
        children: [
            { id: "3.1", text: "Header component", status: "pending" },
            { id: "3.2", text: "Main layout", status: "pending" },
        ]
    },
];

const meta: Meta<typeof TodoList> = {
    title: "Agent/TodoList",
    component: TodoList,
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <div style={{ background: "#0f0f23", padding: 24, minHeight: 300 }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof TodoList>;

export const Default: Story = {
    args: {
        todos: sampleTodos,
    },
};

export const AllDone: Story = {
    args: {
        todos: sampleTodos.map(t => ({
            ...t,
            status: "done" as const,
            children: t.children?.map(c => ({ ...c, status: "done" as const })),
        })),
    },
};

export const WithAllRoles: Story = {
    args: {
        todos: [
            {
                id: "a1", text: "Plan sprint objectives", status: "done", assignee: "Admin",
                children: [
                    { id: "a1.1", text: "Define priorities", status: "done", assignee: "Admin" },
                    { id: "a1.2", text: "Assign tasks to agents", status: "done", assignee: "Admin" },
                ]
            },
            {
                id: "a2", text: "Coordinate agent workflow", status: "in_progress", assignee: "Orchestrator",
                children: [
                    { id: "a2.1", text: "Route task to Worker-1", status: "done", assignee: "Orchestrator" },
                    { id: "a2.2", text: "Monitor Worker-2 progress", status: "in_progress", assignee: "Orchestrator" },
                    { id: "a2.3", text: "Merge results", status: "pending", assignee: "Orchestrator" },
                ]
            },
            {
                id: "a3", text: "Implement auth module", status: "in_progress", assignee: "Worker",
                children: [
                    { id: "a3.1", text: "Create login endpoint", status: "done", assignee: "Worker" },
                    { id: "a3.2", text: "Add JWT middleware", status: "in_progress", assignee: "Worker" },
                    { id: "a3.3", text: "Write unit tests", status: "pending", assignee: "Worker" },
                ]
            },
            {
                id: "a4", text: "Refactor database layer", status: "pending",
                children: [
                    { id: "a4.1", text: "Migrate to new schema", status: "pending" },
                    { id: "a4.2", text: "Update queries", status: "pending" },
                ]
            },
        ],
    },
};
