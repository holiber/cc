"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface XtermViewProps {
    wsUrl: string;
    onTitleChange?: (title: string) => void;
    active: boolean; // Prop to trigger resize when tab becomes active
}

export default function XtermView({ wsUrl, onTitleChange, active }: XtermViewProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const closingByCleanupRef = useRef(false);
    const disposedRef = useRef(false);

    useEffect(() => {
        if (!terminalRef.current) return;
        closingByCleanupRef.current = false;
        disposedRef.current = false;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 11,
            theme: {
                background: '#1e1e1e',
            }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect WebSocket
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
            if (disposedRef.current) return;
            term.write('\r\n\x1b[32mConnected to terminal\x1b[0m\r\n');
            // Send resize after connection — clamp to avoid node-pty crash on 0×0
            fitAddon.fit();
            const cols = Math.max(term.cols || 80, 80);
            const rows = Math.max(term.rows || 24, 24);
            ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        };

        ws.onmessage = (event) => {
            if (disposedRef.current) return;
            if (typeof event.data === 'string') {
                term.write(event.data);
            } else {
                term.write(new Uint8Array(event.data as ArrayBuffer));
            }
        };

        ws.onclose = (e) => {
            // In Next.js dev (StrictMode), effects may mount → cleanup → mount.
            // Avoid printing a scary disconnect message when we intentionally closed the socket during cleanup.
            if (disposedRef.current || closingByCleanupRef.current) return;
            console.warn('XtermView WebSocket closed:', e.code, e.reason);
            term.write(`\r\n\x1b[31mConnection closed (Code: ${e.code}, Reason: ${e.reason})\x1b[0m\r\n`);
        };

        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                // Determine if control or input? 
                // Our server expects CONTROL as JSON string, INPUT as BINARY (Blob/ArrayBuffer)?
                // Xterm onData gives string.
                // We said: Client sends TEXT for Control (JSON), BINARY for Input.
                // But WebSocket.send(string) is text frame. WebSocket.send(blob/arraybuffer) is binary.
                // So for input we must send Blob/ArrayBuffer.
                const encoder = new TextEncoder();
                ws.send(encoder.encode(data));
            }
        });

        term.onTitleChange((title) => {
            onTitleChange?.(title);
        });

        const handleResize = () => {
            fitAddon.fit();
            if (ws.readyState === WebSocket.OPEN) {
                const cols = Math.max(term.cols || 80, 80);
                const rows = Math.max(term.rows || 24, 24);
                ws.send(JSON.stringify({ type: 'resize', cols, rows }));
            }
        };

        window.addEventListener('resize', handleResize);

        // Resize on init
        setTimeout(handleResize, 100);

        return () => {
            closingByCleanupRef.current = true;
            disposedRef.current = true;
            window.removeEventListener('resize', handleResize);
            try {
                // Detach handlers so late events can't write into a disposed terminal.
                ws.onopen = null;
                ws.onmessage = null;
                ws.onclose = null;
                ws.onerror = null;
            } catch { /* ignore */ }
            try {
                // Provide a clean close code; browsers may ignore reason.
                ws.close(1000, 'component_unmount');
            } catch { /* ignore */ }
            term.dispose();
        };
    }, [wsUrl]);

    // Handle active state change to refit
    useEffect(() => {
        if (active && fitAddonRef.current && xtermRef.current) {
            // Need a small delay for DOM to settle if switching from hidden
            setTimeout(() => {
                fitAddonRef.current?.fit();
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'resize',
                        cols: xtermRef.current!.cols,
                        rows: xtermRef.current!.rows
                    }));
                }
                xtermRef.current?.focus();
            }, 50);
        }
    }, [active]);

    return (
        <div
            ref={terminalRef}
            data-testid="xterm-container"
            className="w-full h-full overflow-hidden bg-[#1e1e1e]"
            // Ensure clicks focus the hidden textarea so keyboard input works reliably (including in E2E).
            onMouseDown={() => {
                try { xtermRef.current?.focus(); } catch { /* ignore */ }
            }}
        />
    );
}
