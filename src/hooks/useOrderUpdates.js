// hooks/useOrderUpdates.js - React hook for real-time order management
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import wsClient from '../lib/websocket-client';

// WebSocket configuration
const WEBSOCKET_CONFIG = {
    INVENTORY_WS_URL: 'ws://localhost:3004', // Your WebSocket server URL
    RECONNECT_INTERVAL: 5000, // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 5
};

export const useOrderUpdates = (initialOrders = []) => {
    const [orders, setOrders] = useState(initialOrders);
    const [connectionStatus, setConnectionStatus] = useState({
        connected: false,
        reconnectAttempts: 0
    });

    // Handle new order notifications
    const handleNewOrder = useCallback((data) => {
        console.log('🆕 New order received:', data);
        
        if (data.data) {
            setOrders(prevOrders => {
                // Check if order already exists to prevent duplicates
                const existingOrder = prevOrders.find(order => order.id === data.data.id);
                if (existingOrder) {
                    console.log('Order already exists, skipping duplicate');
                    return prevOrders;
                }

                // Add new order to the beginning of the list
                const newOrders = [data.data, ...prevOrders];
                
                // Show notification with Nigerian Naira formatting
                const currency = data.data.currency || 'NGN';
                const totalFormatted = data.data.total ? data.data.total.toLocaleString() : '0';
                
                toast.success(`New order received: ${data.data.orderId}`, {
                    description: `From ${data.data.customerName} - ${currency} ${totalFormatted}`,
                    duration: 5000,
                    action: {
                        label: 'View',
                        onClick: () => {
                            // You can add logic here to open order details
                            console.log('View order:', data.data.id);
                        }
                    }
                });

                return newOrders;
            });
        }
    }, []);

    // Handle order status updates
    const handleOrderStatusUpdate = useCallback((data) => {
        console.log('📝 Order status updated:', data);
        
        if (data.data) {
            setOrders(prevOrders => {
                return prevOrders.map(order => {
                    if (order.id === data.data.orderId) {
                        const updatedOrder = {
                            ...order,
                            status: data.data.status,
                            paymentStatus: data.data.paymentStatus || order.paymentStatus,
                            trackingNumber: data.data.trackingNumber || order.trackingNumber,
                            updatedAt: new Date().toISOString()
                        };

                        // Show notification for status updates
                        toast.info(`Order ${order.orderId} status updated`, {
                            description: `Status changed to ${data.data.status}`,
                            duration: 4000
                        });

                        return updatedOrder;
                    }
                    return order;
                });
            });
        }
    }, []);

    // Handle connection status changes
    const handleConnectionChange = useCallback((data) => {
        console.log('🔌 Connection status changed:', data);
        
        setConnectionStatus(prev => ({
            ...prev,
            connected: data.connected,
            reconnectAttempts: data.connected ? 0 : prev.reconnectAttempts
        }));

        if (data.connected) {
            toast.success('Connected to real-time updates', {
                duration: 2000
            });
        } else {
            toast.error('Lost connection to real-time updates', {
                duration: 3000
            });
        }
    }, []);

    // Handle WebSocket errors
    const handleError = useCallback((error) => {
        console.error('🚨 WebSocket error:', error);
        setConnectionStatus(prev => ({
            ...prev,
            connected: false,
            reconnectAttempts: prev.reconnectAttempts + 1
        }));
    }, []);

    // Function to manually refresh connection
    const refreshConnection = useCallback(() => {
        console.log('🔄 Manually refreshing WebSocket connection...');
        
        try {
            wsClient.disconnect();
            
            setTimeout(() => {
                wsClient.connect(WEBSOCKET_CONFIG.INVENTORY_WS_URL);
                
                setConnectionStatus(prev => ({
                    ...prev,
                    reconnectAttempts: prev.reconnectAttempts + 1
                }));
            }, 1000);
            
            toast.info('Attempting to reconnect...', {
                duration: 2000
            });
        } catch (error) {
            console.error('Failed to refresh connection:', error);
            toast.error('Failed to reconnect. Please try again.');
        }
    }, []);

    // Initialize WebSocket connection and event listeners
    useEffect(() => {
        console.log('🔌 Initializing WebSocket connection for order updates');

        try {
            // Connect to WebSocket
            wsClient.connect(WEBSOCKET_CONFIG.INVENTORY_WS_URL);

            // Set up event listeners
            wsClient.on('new_order', handleNewOrder);
            wsClient.on('order_status_update', handleOrderStatusUpdate);
            wsClient.on('connected', handleConnectionChange);
            wsClient.on('disconnected', handleConnectionChange);
            wsClient.on('error', handleError);

            // Update initial connection status
            const status = wsClient.getConnectionStatus();
            setConnectionStatus(status);

            // Set up periodic connection health checks
            const healthCheckInterval = setInterval(() => {
                const currentStatus = wsClient.getConnectionStatus();
                if (currentStatus.connected !== connectionStatus.connected) {
                    setConnectionStatus(currentStatus);
                }
            }, 10000); // Check every 10 seconds

            // Cleanup function
            return () => {
                console.log('🧹 Cleaning up WebSocket listeners and intervals');
                
                clearInterval(healthCheckInterval);
                
                wsClient.off('new_order', handleNewOrder);
                wsClient.off('order_status_update', handleOrderStatusUpdate);
                wsClient.off('connected', handleConnectionChange);
                wsClient.off('disconnected', handleConnectionChange);
                wsClient.off('error', handleError);
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket connection:', error);
            toast.error('Failed to connect to real-time updates');
        }
    }, [handleConnectionChange, handleNewOrder, handleOrderStatusUpdate, handleError, connectionStatus.connected]);

    // Update orders when initialOrders prop changes
    useEffect(() => {
        if (initialOrders.length > 0) {
            console.log('📦 Updating orders from props:', initialOrders.length);
            setOrders(initialOrders);
        }
    }, [initialOrders]);

    // Auto-reconnect logic
    useEffect(() => {
        if (!connectionStatus.connected && 
            connectionStatus.reconnectAttempts < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS &&
            connectionStatus.reconnectAttempts > 0) {
            
            const timeoutId = setTimeout(() => {
                console.log(`🔄 Auto-reconnect attempt ${connectionStatus.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS}`);
                refreshConnection();
            }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);

            return () => clearTimeout(timeoutId);
        }
    }, [connectionStatus.connected, connectionStatus.reconnectAttempts, refreshConnection]);

    return {
        orders,
        setOrders,
        connectionStatus,
        refreshConnection
    };
};