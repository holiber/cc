import type { Meta, StoryObj } from "storybook-react-rsbuild";
import { fn } from "storybook/test";
import BurgerMenu from "@/components/BurgerMenu";

const meta: Meta<typeof BurgerMenu> = {
    title: "Navigation/BurgerMenu",
    component: BurgerMenu,
    args: {
        onNavigate: fn(),
    },
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
                <div style={{ padding: "80px 24px" }}>
                    <h2 style={{ fontSize: 14, color: "#999", marginBottom: 8 }}>
                        Click the burger icon in the top-right corner ↗
                    </h2>
                    <p style={{ fontSize: 12, color: "#666" }}>
                        The dropdown lists all application pages. Clicks are
                        logged in the Actions panel below.
                    </p>
                </div>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof BurgerMenu>;

export const Default: Story = {};
