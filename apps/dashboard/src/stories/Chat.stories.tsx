import type { Meta, StoryObj } from "storybook-react-rsbuild";
import Chat from "@/components/Chat";
import type { ChatMessage } from "@/types/agent";

const sampleMessages: ChatMessage[] = [
    { role: "system", text: "Orchestrator ready. Single worker." },
    { role: "user", text: "Start the project setup" },
    { role: "orchestrator", text: "Delegating to Worker #1..." },
    { role: "worker", text: ".gitignore: INIT REPO" },
    { role: "worker", text: "package.json: SETUP DEPS" },
    { role: "system", text: "✅ All tasks completed!" },
];

const meta: Meta<typeof Chat> = {
    title: "Agent/Chat",
    component: Chat,
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <div style={{ height: "300px", width: "250px" }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Chat>;

export const Default: Story = {
    args: {
        messages: sampleMessages,
        onSend: (text: string) => console.log("Sent:", text),
    },
};

export const Empty: Story = {
    args: {
        messages: [{ role: "system", text: "Waiting for input..." }],
        onSend: (text: string) => console.log("Sent:", text),
        placeholder: "Type a command...",
    },
};
