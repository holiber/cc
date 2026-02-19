
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Load cookies from Playwright auth state
const authPath = path.join(process.cwd(), 'apps/dashboard/playwright/.auth/user.json');
let cookieHeader = '';
if (fs.existsSync(authPath)) {
    const authState = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    cookieHeader = authState.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log('Using cookies:', cookieHeader);
}

const ws = new WebSocket('ws://localhost:3222/api/terminal-ws', {
    headers: {
        'Origin': 'http://localhost:3222',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookieHeader,
        'Pragma': 'no-cache',
        // 'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br, zstd'
    }
});

ws.on('open', () => {
    console.log('Connected!');
    // Mimic xterm.js fit addon + resize - from failed test logs
    ws.send(JSON.stringify({ type: 'resize', cols: 191, rows: 24 }));
});

ws.on('message', (data) => {
    console.log(`Received ${data.length} bytes: ${JSON.stringify(data.toString())}`);
});

ws.on('close', (code, reason) => {
    console.log('Closed:', code, reason.toString());
});

ws.on('error', (err) => {
    console.error('Error:', err);
});
