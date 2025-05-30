// lib/websocket-config.js
export const WEBSOCKET_CONFIG = {
    // Your storefront URL (where orders come from)
    SERVER_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
    
    // Webhook URL for your inventory app (where notifications are received)
    INVENTORY_WEBHOOK_URL: process.env.INVENTORY_WEBHOOK_URL || 'http://localhost:3002/api/webhooks/order-notifications',
    
    // Alternative webhook URL for external services
    WEBHOOK_URL: process.env.WEBHOOK_URL || null,
    
    // Webhook secret for secure communication
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your-webhook-secret-key-change-this',
    
    // SSE endpoint for real-time notifications
    SSE_ENDPOINT: '/api/orders/notifications',
    
    // Notification settings
    NOTIFICATION_SETTINGS: {
        // Auto-retry settings
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        
        // Connection settings
        heartbeatInterval: 30000, // 30 seconds
        reconnectDelay: 2000, // 2 seconds
        maxReconnectAttempts: 5,
        
        // Browser notification settings
        enableBrowserNotifications: true,
        enableSounds: true,
        soundVolume: 0.3
    }
};

// Environment-specific configurations
if (process.env.NODE_ENV === 'production') {
    // Production settings
    WEBSOCKET_CONFIG.SERVER_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://your-storefront.com';
    WEBSOCKET_CONFIG.INVENTORY_WEBHOOK_URL = process.env.INVENTORY_WEBHOOK_URL || 'https://your-inventory-app.com/api/webhooks/order-notifications';
} else if (process.env.NODE_ENV === 'development') {
    // Development settings
    WEBSOCKET_CONFIG.SERVER_URL = 'ws://localhost:3001';
    WEBSOCKET_CONFIG.INVENTORY_WEBHOOK_URL = 'http://localhost:3002/api/webhooks/order-notifications';
}

export default WEBSOCKET_CONFIG;