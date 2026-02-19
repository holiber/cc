import { motion } from "framer-motion";

export function AnimatedOrb({ isActive, size = 20 }: { isActive: boolean; size?: number }) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <motion.div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #c084fc, #7c3aed, #4c1d95)" }}
                animate={isActive ? { scale: [1, 1.15, 1], boxShadow: ["0 0 6px rgba(192,132,252,0.4)", "0 0 16px rgba(192,132,252,0.8)", "0 0 6px rgba(192,132,252,0.4)"] } : {}}
                transition={{ duration: 1.2, repeat: Infinity }} />
        </div>
    );
}
