/**
 * Custom dev server wrapper.
 * Wraps the standard Next.js dev server.
 * Also properly forwards HMR WebSocket upgrades to Next.js.
 * 
 * Usage: node server.mjs (replaces `next dev`)
 */
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { config } from 'dotenv';

config({ path: '.env' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3222', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Must be called after prepare()
    const nextUpgradeHandler = app.getUpgradeHandler();

    const server = createServer(async (req, res) => {
        try {
            await handle(req, res);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('Internal server error');
        }
    });

    // Handle WebSocket upgrade requests
    server.on('upgrade', (req, socket, head) => {
        // Forward HMR and other Next.js WebSocket upgrades
        nextUpgradeHandler(req, socket, head);
    });

    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
