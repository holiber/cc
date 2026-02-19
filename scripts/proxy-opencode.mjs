import 'dotenv/config';
import http from 'http';
import httpProxy from 'http-proxy';
import path from 'path';
import { config } from 'dotenv';

// Load .env from the dashboard app
config({ path: path.resolve(import.meta.dirname, 'apps/dashboard/.env') });

const PROXY_PORT = parseInt(process.env.NEXT_PUBLIC_OPENCODE_PROXY_PORT || '4097', 10);
const OPENCODE_PORT = parseInt(process.env.OPENCODE_PORT || '4096', 10);
const TARGET_URL = `http://127.0.0.1:${OPENCODE_PORT}`;

const proxy = httpProxy.createProxyServer({});

// Listen for the `proxyRes` event on `proxy`.
proxy.on('proxyRes', function (proxyRes, req, res) {
    // Strip restrictive headers to allow iframe embedding
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];

    // Allow CORS just in case
    proxyRes.headers['access-control-allow-origin'] = '*';
});

proxy.on('error', function (err, req, res) {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`OpenCode proxy error. Check if OpenCode is running on port ${OPENCODE_PORT}.`);
});

const server = http.createServer(function (req, res) {
    // Forward to OpenCode
    proxy.web(req, res, { target: TARGET_URL });
});

console.log(`Starting OpenCode proxy on port ${PROXY_PORT} -> ${TARGET_URL}`);
server.listen(PROXY_PORT);
