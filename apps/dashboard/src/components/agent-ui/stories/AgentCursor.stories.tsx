import type { Meta, StoryObj } from '@storybook/react';
import { AgentCursor } from '../AgentCursor';
import { FiLayout } from 'react-icons/fi';
import { WorkerAgent } from '../types';

const meta: Meta<typeof AgentCursor> = {
    title: 'Agent UI/AgentCursor',
    component: AgentCursor,
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="relative h-40 w-full bg-gray-900 overflow-hidden">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AgentCursor>;

const mockAgent: WorkerAgent = {
    id: 'frontend',
    name: 'Frontend',
    color: '#60a5fa',
    icon: FiLayout,
    currentFile: 'page.tsx',
    currentTask: 'BUILDING UI',
    thought: 'Adding responsive grid layout...',
    isWorking: true,
    linesAdded: 10,
    linesRemoved: 2,
    yPosition: 20,
};

export const Working: Story = {
    args: {
        agent: mockAgent,
    },
};

export const Idle: Story = {
    args: {
        agent: {
            ...mockAgent,
            isWorking: false,
        },
    },
};
