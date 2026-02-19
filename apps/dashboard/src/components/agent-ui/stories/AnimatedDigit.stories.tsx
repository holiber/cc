import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedDigit } from '../AnimatedDigit';

const meta: Meta<typeof AnimatedDigit> = {
    title: 'Agent UI/AnimatedDigit',
    component: AnimatedDigit,
    tags: ['autodocs'],
    argTypes: {
        color: { control: 'color' },
        value: { control: 'number' },
    },
};

export default meta;
type Story = StoryObj<typeof AnimatedDigit>;

export const Default: Story = {
    args: {
        value: 100,
        color: '#22c55e',
    },
};

export const Negative: Story = {
    args: {
        value: -50,
        color: '#ef4444',
    },
};
