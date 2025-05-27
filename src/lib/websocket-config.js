// lib/websocket-config.js
// Shared WebSocket configuration for both apps

export const WEBSOCKET_CONFIG = {
    // Use environment variable or fallback to localhost
    INVENTORY_WS_URL: process.env.INVENTORY_WEBSOCKET_URL || 'ws://localhost:3002',
    STOREFRONT_WS_URL: process.env.STOREFRONT_WEBSOCKET_URL || 'ws://localhost:3000',
    
    // WebSocket events
    EVENTS: {
        NEW_ORDER: 'new_order',
        ORDER_STATUS_UPDATE: 'order_status_update',
        CONNECTION: 'connection',
        DISCONNECT: 'disconnect',
        JOIN_ROOM: 'join_room',
        LEAVE_ROOM: 'leave_room'
    },
    
    // Rooms for organizing connections
    ROOMS: {
        INVENTORY_ADMIN: 'inventory_admin',
        CUSTOMER_ORDERS: 'customer_orders'
    },
    
    // Retry configuration
    RETRY: {
        MAX_ATTEMPTS: 5,
        DELAY: 1000, // 1 second
        BACKOFF_MULTIPLIER: 2
    }
};

export const WEBHOOK_CONFIG = {
    // Webhook URLs - set these in your environment variables
    INVENTORY_WEBHOOK_URL: process.env.INVENTORY_WEBHOOK_URL || 'http://localhost:3002/api/orders/receive-webhook',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your-webhook-secret-key'
};