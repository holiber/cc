import { useState, useEffect } from "react";

export function TypewriterText({ text, speed = 25 }: { text: string; speed?: number }) {
    const [displayed, setDisplayed] = useState("");
    useEffect(() => { setDisplayed(""); let i = 0; const interval = setInterval(() => { if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; } else clearInterval(interval); }, speed); return () => clearInterval(interval); }, [text, speed]);
    return <span>{displayed}<span className="animate-pulse">|</span></span>;
}
