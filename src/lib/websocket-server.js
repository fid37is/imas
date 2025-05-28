import { Server } from 'socket.io';
import { WEBSOCKET_CONFIG } from '../lib/websocket-config';

let io = null;
const rooms = new Map(); // Track rooms and their clients

// Initialize WebSocket server
export const initializeWebSocketServer = (server) => {
    if (io) {
        console.log('WebSocket server already initialized');
        return io;
    }

    io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                process.env.STOREFRONT_URL,
                process.env.INVENTORY_URL
            ].filter(Boolean), // remove undefined entries
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Handle joining rooms
        socket.on(WEBSOCKET_CONFIG.EVENTS.JOIN_ROOM, (room) => {
            socket.join(room);
            if (!rooms.has(room)) rooms.set(room, new Set());
            rooms.get(room).add(socket.id);

            console.log(`Client ${socket.id} joined room: ${room}`);
            socket.emit('room_joined', { room, clientId: socket.id });
        });

        // Handle leaving rooms
        socket.on(WEBSOCKET_CONFIG.EVENTS.LEAVE_ROOM, (room) => {
            socket.leave(room);
            if (rooms.has(room)) {
                rooms.get(room).delete(socket.id);
                if (rooms.get(room).size === 0) rooms.delete(room);
            }
            console.log(`Client ${socket.id} left room: ${room}`);
        });

        // Handle ping
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
            rooms.forEach((clients, room) => {
                if (clients.delete(socket.id) && clients.size === 0) {
                    rooms.delete(room);
                }
            });
        });

        socket.on('error', (error) => {
            console.error(`Socket error for ${socket.id}:`, error);
        });
    });

    console.log('✅ WebSocket server initialized');
    return io;
};

// Broadcast message to a specific room
export const broadcastToRoom = (room, data) => {
    if (!io) {
        console.error('❌ WebSocket server not initialized');
        return false;
    }

    try {
        io.to(room).emit('message', data);
        console.log(`📢 Broadcasted to room ${room}: ${data.type || 'unknown'}`);
        return true;
    } catch (error) {
        console.error('❌ Error broadcasting to room:', error);
        return false;
    }
};

// Broadcast to all clients
export const broadcastToAll = (data) => {
    if (!io) {
        console.error('❌ WebSocket server not initialized');
        return false;
    }

    try {
        io.emit('message', data);
        console.log(`📢 Broadcasted to all clients: ${data.type || 'unknown'}`);
        return true;
    } catch (error) {
        console.error('❌ Error broadcasting to all clients:', error);
        return false;
    }
};

// Send to specific client by ID
export const sendToClient = (clientId, data) => {
    if (!io) {
        console.error('❌ WebSocket server not initialized');
        return false;
    }

    try {
        io.to(clientId).emit('message', data);
        console.log(`📨 Sent message to client ${clientId}: ${data.type || 'unknown'}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending to client:', error);
        return false;
    }
};

// Get stats on rooms
export const getRoomStats = () => {
    const stats = {};
    rooms.forEach((clients, room) => {
        stats[room] = clients.size;
    });
    return stats;
};

// Get total connected clients
export const getConnectedClientsCount = () => {
    return io?.engine?.clientsCount ?? 0;
};

export { io };
