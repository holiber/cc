import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedOrb } from '../AnimatedOrb';

const meta: Meta<typeof AnimatedOrb> = {
    title: 'Agent UI/AnimatedOrb',
    component: AnimatedOrb,
    tags: ['autodocs'],
    argTypes: {
        isActive: { control: 'boolean' },
        size: { control: 'number' },
    },
};

export default meta;
type Story = StoryObj<typeof AnimatedOrb>;

export const Active: Story = {
    args: {
        isActive: true,
        size: 20,
    },
};

export const Inactive: Story = {
    args: {
        isActive: false,
        size: 20,
    },
};
