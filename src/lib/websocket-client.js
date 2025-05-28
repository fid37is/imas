// lib/websocket-client.js - Enhanced WebSocket client
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.url = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.connectionStatus = {
            connected: false,
            reconnectAttempts: 0
        };
    }

    connect(url) {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket connection already in progress');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        this.url = url;
        this.isConnecting = true;

        try {
            console.log(`🔌 Connecting to WebSocket: ${url}`);
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected successfully');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.connectionStatus.connected = true;
                this.connectionStatus.reconnectAttempts = 0;
                
                // Join the inventory_admin room
                this.send('join_room', { room: 'inventory_admin' });
                
                this.emit('connected', { connected: true });
            };

            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket connection closed:', event.code, event.reason);
                this.isConnecting = false;
                this.connectionStatus.connected = false;
                this.emit('disconnected', { connected: false });

                // Auto-reconnect if not manually closed
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.isConnecting = false;
                this.emit('error', { error });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', data);
                    
                    // Handle different message types
                    if (data.type) {
                        this.emit(data.type, data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        this.connectionStatus.reconnectAttempts = this.reconnectAttempts;
        
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (this.url) {
                this.connect(this.url);
            }
        }, delay);
    }

    send(type, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = { type, ...data };
            console.log('📤 Sending WebSocket message:', message);
            this.ws.send(JSON.stringify(message));
            return true;
        } else {
            console.warn('WebSocket not connected, cannot send message:', type, data);
            return false;
        }
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
        if (this.ws) {
            console.log('🔌 Manually disconnecting WebSocket');
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        this.connectionStatus.connected = false;
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    }

    getConnectionStatus() {
        return {
            ...this.connectionStatus,
            readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED
        };
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Create singleton instance
const wsClient = new WebSocketClient();

export default wsClient;