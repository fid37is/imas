import { Server } from 'http';
import express from 'express';
import next from 'next';
import { initializeWebSocketServer } from './lib/websocket-server'; // your fixed file

const port = process.env.PORT || 3001;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const expressApp = express();
    const server = Server(expressApp);

    // ✅ Initialize WebSocket server just once
    initializeWebSocketServer(server);

    expressApp.all('*', (req, res) => {
        return handle(req, res);
    });

    server.listen(port, () => {
        console.log(`🚀 Inventory app ready at http://localhost:${port}`);
    });
});
