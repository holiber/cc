import type { Meta, StoryObj } from '@storybook/react';
import { ShinyText } from '../ShinyText';

const meta: Meta<typeof ShinyText> = {
    title: 'Agent UI/ShinyText',
    component: ShinyText,
    tags: ['autodocs'],
    argTypes: {
        color: { control: 'color' },
    },
};

export default meta;
type Story = StoryObj<typeof ShinyText>;

export const Purple: Story = {
    args: {
        text: 'Orchestrating Phase 1...',
        color: '#a855f7',
    },
};

export const Blue: Story = {
    args: {
        text: 'Frontend Building...',
        color: '#3b82f6',
    },
};
