import type { StorybookConfig } from "storybook-react-rsbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
    stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    framework: {
        name: "storybook-react-rsbuild",
        options: {
            rsbuildConfigPath: undefined,
        },
    },
    rsbuildFinal: (config) => {
        // Fix path alias @/ -> ./src/
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...config.resolve.alias,
            "@": path.resolve(__dirname, "../src"),
        };

        // Enable automatic JSX runtime
        config.tools = config.tools || {};
        config.tools.swc = {
            jsc: {
                transform: {
                    react: {
                        runtime: "automatic",
                    },
                },
            },
        };

        // Enable Tailwind CSS v4 via PostCSS
        config.tools.postcss = {
            postcssOptions: {
                plugins: [
                    ["@tailwindcss/postcss", {}],
                ],
            },
        };

        return config;
    },
};

export default config;
