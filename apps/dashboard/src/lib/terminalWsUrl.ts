const TERMINAL_WS_PORT = process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || "3223";
const TERMINAL_WS_URL = process.env.NEXT_PUBLIC_TERMINAL_WS_URL || "";
const TERMINAL_WS_MODE = (
  process.env.NEXT_PUBLIC_TERMINAL_WS_MODE || ""
).toLowerCase();

function resolveWsOverride(
  raw: string,
  protocol: string,
  host: string,
): string {
  if (!raw) return "";
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) return raw;
  if (raw.startsWith("//")) return `${protocol}${raw}`;
  if (raw.startsWith("/")) return `${protocol}//${host}${raw}`;
  return `${protocol}//${raw}`;
}

export function getTerminalWsUrl(): string {
  if (typeof window === "undefined") {
    if (TERMINAL_WS_URL)
      return resolveWsOverride(TERMINAL_WS_URL, "ws:", "localhost");
    if (TERMINAL_WS_MODE === "proxy") return "ws://localhost/ws/terminal";
    return `ws://localhost:${TERMINAL_WS_PORT}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;

  if (TERMINAL_WS_URL)
    return resolveWsOverride(TERMINAL_WS_URL, protocol, host);
  if (TERMINAL_WS_MODE === "proxy")
    return `${protocol}//${host}/ws/terminal`;
  if (TERMINAL_WS_MODE === "direct")
    return `${protocol}//${window.location.hostname}:${TERMINAL_WS_PORT}`;

  // Default:
  // - HTTPS/prod: use same-origin proxy (Cloudflare/Tunnel-friendly)
  // - HTTP/dev/E2E: keep direct port for deterministic local runs
  if (window.location.protocol === "https:")
    return `${protocol}//${host}/ws/terminal`;
  return `${protocol}//${window.location.hostname}:${TERMINAL_WS_PORT}`;
}
