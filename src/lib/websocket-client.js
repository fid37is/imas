// lib/websocket-client.js - Socket.IO client (REPLACE your existing file)
import { io } from 'socket.io-client';

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.url = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnecting = false;
        this.connectionStatus = {
            connected: false,
            reconnectAttempts: 0
        };
    }

    connect(url) {
        if (this.isConnecting || (this.socket && this.socket.connected)) {
            console.log('Socket.IO connection already established or in progress');
            return;
        }

        // Convert ws:// to http:// for Socket.IO
        const socketUrl = url.replace('ws://', 'http://');
        this.url = socketUrl;
        this.isConnecting = true;

        try {
            console.log(`🔌 Connecting to Socket.IO server: ${socketUrl}`);
            
            this.socket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                timeout: 10000
            });

            this.socket.on('connect', () => {
                console.log('✅ Socket.IO connected successfully');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.connectionStatus.connected = true;
                this.connectionStatus.reconnectAttempts = 0;
                
                // Join the inventory_admin room
                this.socket.emit('join_room', 'inventory_admin');
                console.log('📡 Joined inventory_admin room');
                
                this.emit('connected', { connected: true });
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔌 Socket.IO disconnected:', reason);
                this.isConnecting = false;
                this.connectionStatus.connected = false;
                this.emit('disconnected', { connected: false });
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error);
                this.isConnecting = false;
                this.reconnectAttempts++;
                this.connectionStatus.reconnectAttempts = this.reconnectAttempts;
                this.emit('error', { error });
            });

            // Listen for room confirmation
            this.socket.on('room_joined', (data) => {
                console.log('✅ Successfully joined room:', data);
            });

            // Listen for messages from server
            this.socket.on('message', (data) => {
                console.log('📨 Socket.IO message received:', data);
                
                // Emit the specific event type
                if (data.type) {
                    this.emit(data.type, data);
                }
            });

            // Listen for pong responses
            this.socket.on('pong', (data) => {
                console.log('🏓 Pong received:', data);
            });

        } catch (error) {
            console.error('Failed to create Socket.IO connection:', error);
            this.isConnecting = false;
        }
    }

    send(type, data = {}) {
        if (this.socket && this.socket.connected) {
            const message = { type, ...data };
            console.log('📤 Sending Socket.IO message:', message);
            this.socket.emit(type, data);
            return true;
        } else {
            console.warn('Socket.IO not connected, cannot send message:', type, data);
            return false;
        }
    }

    // Send ping to test connection
    ping() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('ping');
            return true;
        }
        return false;
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        console.log(`👂 Added listener for event: ${event}`);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            console.log(`🔇 Removed listener for event: ${event}`);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            console.log(`📢 Emitting event: ${event}`, data);
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        if (this.socket) {
            console.log('🔌 Manually disconnecting Socket.IO');
            this.socket.disconnect();
            this.socket = null;
        }
        this.connectionStatus.connected = false;
    }

    getConnectionStatus() {
        return {
            ...this.connectionStatus,
            connected: this.socket ? this.socket.connected : false
        };
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }
}

// Create singleton instance
const wsClient = new WebSocketClient();

export default wsClient;