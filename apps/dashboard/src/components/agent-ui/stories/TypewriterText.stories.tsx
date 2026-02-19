import type { Meta, StoryObj } from '@storybook/react';
import { TypewriterText } from '../TypewriterText';

const meta: Meta<typeof TypewriterText> = {
    title: 'Agent UI/TypewriterText',
    component: TypewriterText,
    tags: ['autodocs'],
    argTypes: {
        speed: { control: 'number' },
    },
};

export default meta;
type Story = StoryObj<typeof TypewriterText>;

export const Default: Story = {
    args: {
        text: 'Initializing system sequence...',
        speed: 50,
    },
};

export const Fast: Story = {
    args: {
        text: 'Rapid fire text output...',
        speed: 10,
    },
};
