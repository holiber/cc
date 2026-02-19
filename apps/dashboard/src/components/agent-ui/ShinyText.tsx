import { motion, useMotionValue, useTransform, useAnimationFrame } from "framer-motion";
import { useRef } from "react";

export function ShinyText({ text, color }: { text: string; color: string }) {
    const progress = useMotionValue(0);
    const lastTimeRef = useRef<number | null>(null);
    const elapsedRef = useRef(0);

    useAnimationFrame((time) => {
        if (lastTimeRef.current === null) { lastTimeRef.current = time; return; }
        elapsedRef.current += time - lastTimeRef.current;
        lastTimeRef.current = time;
        progress.set((elapsedRef.current % 2000) / 2000 * 100);
    });

    const backgroundPosition = useTransform(progress, p => `${150 - p * 2}% center`);

    return (
        <motion.span className="font-bold text-xs inline-block" style={{ backgroundImage: `linear-gradient(120deg, ${color} 0%, ${color} 35%, #fff 50%, ${color} 65%, ${color} 100%)`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundPosition }}>{text}</motion.span>
    );
}
