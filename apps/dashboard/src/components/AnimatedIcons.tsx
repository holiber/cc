"use client";

import { motion } from "framer-motion";

// Animated Hourglass - CSS/SVG based
export function AnimatedHourglass({ size = 24, color = "#60a5fa" }: { size?: number; color?: string }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            animate={{ rotate: [0, 0, 180, 180] }}
            transition={{
                duration: 2,
                repeat: Infinity,
                times: [0, 0.4, 0.5, 1],
                ease: "easeInOut"
            }}
        >
            {/* Top bulb */}
            <path
                d="M6 2h12v4c0 3-4 5-6 6c2 1 6 3 6 6v4H6v-4c0-3 4-5 6-6c-2-1-6-3-6-6V2z"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Sand */}
            <motion.path
                d="M9 4h6v2c0 1-1.5 2-3 3"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 1 }}
                animate={{ pathLength: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.svg>
    );
}

// Animated Spinner - smooth rotation
export function AnimatedSpinner({ size = 24, color = "#60a5fa" }: { size?: number; color?: string }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth={2}
                fill="none"
                opacity={0.25}
            />
            <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
            />
        </motion.svg>
    );
}

// Animated Loading Dots
export function AnimatedDots({ size = 24, color = "#60a5fa" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            {[0, 1, 2].map((i) => (
                <motion.circle
                    key={i}
                    cx={6 + i * 6}
                    cy={12}
                    r={2.5}
                    fill={color}
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut" as const,
                    }}
                />
            ))}
        </svg>
    );
}

// Animated Pulse Ring
export function AnimatedPulse({ size = 24, color = "#60a5fa" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" fill={color} />
            <motion.circle
                cx="12"
                cy="12"
                r="4"
                stroke={color}
                strokeWidth={2}
                fill="none"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.circle
                cx="12"
                cy="12"
                r="4"
                stroke={color}
                strokeWidth={2}
                fill="none"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
            />
        </svg>
    );
}

// Animated Check Mark (draws itself)
export function AnimatedCheck({ size = 24, color = "#10b981" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <motion.circle
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth={2}
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            <motion.path
                d="M8 12l3 3 5-6"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.5, ease: "easeInOut" }}
            />
        </svg>
    );
}

// Animated Data Flow (streaming dots)
export function AnimatedDataFlow({ size = 24, color = "#60a5fa" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            {/* Arrow path */}
            <path
                d="M4 12h16M16 8l4 4-4 4"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.3}
            />
            {/* Animated dots */}
            {[0, 1, 2].map((i) => (
                <motion.circle
                    key={i}
                    r={2}
                    fill={color}
                    initial={{ cx: 4, cy: 12, opacity: 0 }}
                    animate={{
                        cx: [4, 20],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </svg>
    );
}

// Animated Gear (rotating)
export function AnimatedGear({ size = 24, color = "#60a5fa" }: { size?: number; color?: string }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
            <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke={color}
                strokeWidth={1.5}
                fill="none"
            />
            <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                stroke={color}
                strokeWidth={1.5}
                fill="none"
            />
        </motion.svg>
    );
}

// Export all animated icons
export const AnimatedIcons = {
    Hourglass: AnimatedHourglass,
    Spinner: AnimatedSpinner,
    Dots: AnimatedDots,
    Pulse: AnimatedPulse,
    Check: AnimatedCheck,
    DataFlow: AnimatedDataFlow,
    Gear: AnimatedGear,
};

export default AnimatedIcons;
