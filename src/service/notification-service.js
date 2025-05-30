// Shared - /services/notification-service.js
import { WEBSOCKET_CONFIG } from '../lib/websocket-config';

class NotificationService {
    constructor() {
        this.subscribers = new Map();
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 1000; // Start with 1 second
    }

    // Subscribe to specific notification types
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(eventType);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.subscribers.delete(eventType);
                }
            }
        };
    }

    // Emit notification to subscribers
    emit(eventType, data) {
        const callbacks = this.subscribers.get(eventType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in notification callback for ${eventType}:`, error);
                }
            });
        }
    }

    // Send webhook notification
    async sendWebhook(url, data, options = {}) {
        const {
            retries = 3,
            timeout = 10000,
            headers = {}
        } = options;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'NotificationService/1.0',
                        ...headers
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    return {
                        success: true,
                        status: response.status,
                        attempt: attempt + 1
                    };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (error) {
                console.error(`Webhook attempt ${attempt + 1} failed:`, error.message);

                if (attempt === retries) {
                    return {
                        success: false,
                        error: error.message,
                        attempts: attempt + 1
                    };
                }

                // Wait before retry (exponential backoff)
                await new Promise(resolve => 
                    setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
            }
        }
    }

    // Send real-time notification via WebSocket
    async sendRealtimeNotification(data) {
        try {
            // This would typically broadcast to all connected WebSocket clients
            // Implementation depends on your WebSocket server setup
            if (typeof window !== 'undefined' && window.WebSocket) {
                // Client-side: send to server
                return this.sendToWebSocketServer(data);
            } else {
                // Server-side: broadcast to clients
                return this.broadcastToClients(data);
            }
        } catch (error) {
            console.error('Failed to send real-time notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Client-side: send to WebSocket server
    sendToWebSocketServer(data) {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(WEBSOCKET_CONFIG.SERVER_URL);
                
                ws.onopen = () => {
                    ws.send(JSON.stringify(data));
                    resolve({ success: true });
                };

                ws.onerror = (error) => {
                    reject(error);
                };

                ws.onclose = () => {
                    // Connection closed after sending
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    // Server-side: broadcast to all clients (would be implemented in your WebSocket server)
    broadcastToClients(data) {
        // This is a placeholder - actual implementation would depend on your WebSocket server
        console.log('Broadcasting to clients:', data);
        return { success: true };
    }

    // Send order notification with multiple delivery methods
    async sendOrderNotification(orderData, notificationType = 'NEW_ORDER') {
        const notification = {
            type: notificationType,
            timestamp: new Date().toISOString(),
            data: orderData
        };

        const results = {
            realtime: { success: false },
            webhook: { success: false },
            local: { success: true }
        };

        // 1. Send real-time notification via WebSocket
        try {
            results.realtime = await this.sendRealtimeNotification(notification);
        } catch (error) {
            console.error('Real-time notification failed:', error);
            results.realtime = { success: false, error: error.message };
        }

        // 2. Send webhook notification (if webhook URL is configured)
        if (WEBSOCKET_CONFIG.WEBHOOK_URL) {
            try {
                results.webhook = await this.sendWebhook(
                    WEBSOCKET_CONFIG.WEBHOOK_URL,
                    notification,
                    { retries: 2, timeout: 5000 }
                );
            } catch (error) {
                console.error('Webhook notification failed:', error);
                results.webhook = { success: false, error: error.message };
            }
        }

        // 3. Emit local event for any local subscribers
        this.emit(notificationType, orderData);

        return results;
    }

    // Send status update notification
    async sendStatusUpdateNotification(updateData) {
        return this.sendOrderNotification(updateData, 'ORDER_STATUS_UPDATE');
    }

    // Utility method to format notification data
    formatOrderNotification(order, type = 'NEW_ORDER') {
        return {
            type,
            orderId: order.orderId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
            status: order.status,
            timestamp: new Date().toISOString(),
            orderData: order
        };
    }

    // Clean up method
    destroy() {
        this.subscribers.clear();
    }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export both the class and instance
export { NotificationService };
export default notificationService;

// Helper functions for common notification patterns
export const notifyNewOrder = async (orderData) => {
    const formattedNotification = notificationService.formatOrderNotification(orderData, 'NEW_ORDER');
    return notificationService.sendOrderNotification(formattedNotification);
};

export const notifyOrderStatusUpdate = async (updateData) => {
    return notificationService.sendStatusUpdateNotification(updateData);
};

export const subscribeToOrderNotifications = (callback) => {
    const unsubscribeNew = notificationService.subscribe('NEW_ORDER', callback);
    const unsubscribeUpdate = notificationService.subscribe('ORDER_STATUS_UPDATE', callback);
    
    // Return combined unsubscribe function
    return () => {
        unsubscribeNew();
        unsubscribeUpdate();
    };
};