// Inventory App - /hooks/useOrderUpdates.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { WEBSOCKET_CONFIG } from '../lib/websocket-config';

export const useOrderUpdates = () => {
    const [orders, setOrders] = useState([]);
    const [newOrderAlerts, setNewOrderAlerts] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Closed');
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        try {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                return;
            }

            const ws = new WebSocket(WEBSOCKET_CONFIG.INVENTORY_WS_URL);
            socketRef.current = ws;
            setConnectionStatus('Connecting');

            ws.onopen = () => {
                console.log('Inventory WebSocket connected');
                setConnectionStatus('Open');
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (parseError) {
                    console.error('Error parsing WebSocket message:', parseError);
                    setError(parseError);
                }
            };

            ws.onerror = (event) => {
                console.error('Inventory WebSocket error:', event);
                setConnectionStatus('Error');
                setError(event);
            };

            ws.onclose = (event) => {
                console.log('Inventory WebSocket closed:', event.code, event.reason);
                setConnectionStatus('Closed');
                socketRef.current = null;

                // Attempt to reconnect
                if (reconnectAttempts.current < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS && !event.wasClean) {
                    reconnectAttempts.current += 1;
                    console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
                }
            };

        } catch (connectError) {
            console.error('Error creating WebSocket connection:', connectError);
            setError(connectError);
            setConnectionStatus('Error');
        }
    }, [handleWebSocketMessage]);

    const handleWebSocketMessage = useCallback((message) => {
        switch (message.type) {
            case 'new_order':
                console.log('New order received:', message.data);
                setOrders(prevOrders => {
                    // Check if order already exists to prevent duplicates
                    const exists = prevOrders.some(order => order.orderId === message.data.orderId);
                    if (!exists) {
                        setNewOrderAlerts(prev => [...prev, {
                            id: Date.now(),
                            orderId: message.data.orderId,
                            customerName: message.data.customerName,
                            total: message.data.total,
                            timestamp: new Date().toISOString()
                        }]);
                        return [message.data, ...prevOrders];
                    }
                    return prevOrders;
                });
                break;

            case 'order_status_update':
                console.log('Order status updated:', message.data);
                setOrders(prevOrders => 
                    prevOrders.map(order => 
                        order.orderId === message.data.orderId 
                            ? { ...order, ...message.data }
                            : order
                    )
                );
                break;

            case 'order_sync':
                console.log('Order sync received:', message.data);
                if (Array.isArray(message.data)) {
                    setOrders(message.data);
                }
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }, []);

    const updateOrderStatus = useCallback(async (orderId, newStatus, trackingNumber = '') => {
        try {
            const response = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    newStatus,
                    trackingNumber
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }

            const result = await response.json();
            
            // Update local state immediately for better UX
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.orderId === orderId 
                        ? { 
                            ...order, 
                            status: newStatus, 
                            trackingNumber: trackingNumber || order.trackingNumber,
                            updatedAt: new Date().toISOString()
                        }
                        : order
                )
            );

            return result;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    }, []);

    const resendOrderEmail = useCallback(async (order) => {
        try {
            const response = await fetch('/api/orders/resend-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order }),
            });

            if (!response.ok) {
                throw new Error('Failed to resend email');
            }

            return await response.json();
        } catch (error) {
            console.error('Error resending email:', error);
            throw error;
        }
    }, []);

    const syncOrders = useCallback(async () => {
        try {
            const response = await fetch('/api/orders/sync');
            if (!response.ok) {
                throw new Error('Failed to sync orders');
            }
            
            const data = await response.json();
            if (data.orders) {
                setOrders(data.orders);
            }
            
            return data;
        } catch (error) {
            console.error('Error syncing orders:', error);
            throw error;
        }
    }, []);

    const clearAlert = useCallback((alertId) => {
        setNewOrderAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }, []);

    const clearAllAlerts = useCallback(() => {
        setNewOrderAlerts([]);
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (socketRef.current) {
            socketRef.current.close(1000, 'Manual disconnect');
        }
    }, []);

    // Initialize connection and sync orders on mount
    useEffect(() => {
        connect();
        syncOrders();

        return () => {
            disconnect();
        };
    }, [connect, disconnect, syncOrders]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    return {
        orders,
        setOrders,
        newOrderAlerts,
        connectionStatus,
        error,
        isConnected: connectionStatus === 'Open',
        updateOrderStatus,
        resendOrderEmail,
        syncOrders,
        clearAlert,
        clearAllAlerts,
        connect,
        disconnect
    };
};

// Hook for real-time order statistics
export const useOrderStats = (orders) => {
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        processing: 0,
        fulfilled: 0,
        cancelled: 0,
        todayOrders: 0,
        totalRevenue: 0
    });

    useEffect(() => {
        const today = new Date().toDateString();
        
        const newStats = orders.reduce((acc, order) => {
            acc.total += 1;
            acc[order.status] = (acc[order.status] || 0) + 1;
            
            if (new Date(order.orderDate).toDateString() === today) {
                acc.todayOrders += 1;
            }
            
            if (order.status !== 'cancelled') {
                acc.totalRevenue += parseFloat(order.total || 0);
            }
            
            return acc;
        }, {
            total: 0,
            pending: 0,
            processing: 0,
            fulfilled: 0,
            cancelled: 0,
            todayOrders: 0,
            totalRevenue: 0
        });

        setStats(newStats);
    }, [orders]);

    return stats;
};