import type { Meta, StoryObj } from "storybook-react-rsbuild";
import { fn } from "storybook/test";
import Sidebar from "@/components/Sidebar";

const meta: Meta<typeof Sidebar> = {
    title: "Navigation/Sidebar",
    component: Sidebar,
    parameters: {
        layout: "fullscreen",
        backgrounds: { default: "dark" },
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#0f0f23",
                    color: "#e0e0e0",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    position: "relative",
                }}
            >
                <Story />
                <div style={{ marginLeft: 192, padding: "40px 24px" }}>
                    <h2 style={{ fontSize: 14, color: "#999", marginBottom: 8 }}>
                        Page content area
                    </h2>
                    <p style={{ fontSize: 12, color: "#666" }}>
                        The Sidebar is the fixed left nav used on all app pages.
                        It shares its nav items with BurgerMenu via navConfig.ts.
                    </p>
                </div>
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {};
