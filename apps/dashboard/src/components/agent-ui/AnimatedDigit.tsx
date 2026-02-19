import { useState, useEffect } from "react";
import { useSpring } from "framer-motion";

export function AnimatedDigit({ value, color }: { value: number; color: string }) {
    const spring = useSpring(value, { stiffness: 100, damping: 20 });
    const [display, setDisplay] = useState(0);
    useEffect(() => { spring.set(value); const unsub = spring.on("change", v => setDisplay(Math.round(v))); return unsub; }, [value, spring]);
    return <span className="font-mono text-[9px] tabular-nums" style={{ color }}>{display}</span>;
}
