import type { Meta, StoryObj } from "storybook-react-rsbuild";
import FileTree from "@/components/FileTree";
import type { FileNode } from "@/types/agent";

const sampleFiles: FileNode[] = [
    {
        name: "src", type: "folder", expanded: true, children: [
            {
                name: "components", type: "folder", expanded: true, children: [
                    { name: "Header.tsx", type: "file", status: "modified" },
                    { name: "Footer.tsx", type: "file" },
                ]
            },
            { name: "index.ts", type: "file", status: "added" },
            { name: "App.tsx", type: "file" },
        ]
    },
    { name: "package.json", type: "file" },
    { name: "README.md", type: "file" },
];

const meta: Meta<typeof FileTree> = {
    title: "Agent/FileTree",
    component: FileTree,
    parameters: {
        layout: "padded",
    },
};

export default meta;
type Story = StoryObj<typeof FileTree>;

export const Default: Story = {
    args: {
        files: sampleFiles,
    },
};

export const WithModifiedFiles: Story = {
    args: {
        files: [
            {
                name: "src", type: "folder", expanded: true, children: [
                    { name: "index.ts", type: "file", status: "modified" },
                    { name: "utils.ts", type: "file", status: "added" },
                    { name: "old.ts", type: "file", status: "deleted" },
                ]
            },
        ],
    },
};
