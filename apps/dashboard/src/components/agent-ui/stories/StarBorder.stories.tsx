import type { Meta, StoryObj } from '@storybook/react';
import { StarBorder } from '../StarBorder';

const meta: Meta<typeof StarBorder> = {
    title: 'Agent UI/StarBorder',
    component: StarBorder,
    tags: ['autodocs'],
    argTypes: {
        color: { control: 'color' },
    },
    decorators: [
        (Story) => (
            <div className="p-8 bg-gray-900 inline-block">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof StarBorder>;

export const Purple: Story = {
    args: {
        color: '#a855f7',
        children: <div className="p-4 text-white">Content inside star border</div>,
    },
};

export const Green: Story = {
    args: {
        color: '#22c55e',
        children: <div className="p-4 text-white">Success content</div>,
    },
};
