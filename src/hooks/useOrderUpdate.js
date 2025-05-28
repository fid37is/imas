import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// FIXED: WebSocket configuration
const WEBSOCKET_CONFIG = {
    INVENTORY_WS_URL: process.env.NEXT_PUBLIC_INVENTORY_WS_URL || 'http://localhost:3001',
    EVENTS: {
        NEW_ORDER: 'new_order',
        ORDER_STATUS_UPDATE: 'order_status_update',
        JOIN_ROOM: 'join_room',
        LEAVE_ROOM: 'leave_room'
    },
    ROOMS: {
        INVENTORY_ADMIN: 'inventory_admin'
    },
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_INTERVAL: 3000
};

export const useOrderUpdates = () => {
    const [orders, setOrders] = useState([]);
    const [newOrderAlerts, setNewOrderAlerts] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Closed');
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    const reconnectAttempts = useRef(0);

    const handleWebSocketMessage = useCallback((message) => {
        console.log('WebSocket message received:', message);
        
        switch (message.type) {
            case WEBSOCKET_CONFIG.EVENTS.NEW_ORDER:
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

            case WEBSOCKET_CONFIG.EVENTS.ORDER_STATUS_UPDATE:
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

    const connect = useCallback(() => {
        try {
            if (socketRef.current?.connected) {
                return;
            }

            console.log('Connecting to WebSocket server...');
            const socket = io(WEBSOCKET_CONFIG.INVENTORY_WS_URL, {
                path: '/api/socket',
                transports: ['websocket', 'polling']
            });

            socketRef.current = socket;
            setConnectionStatus('Connecting');

            socket.on('connect', () => {
                console.log('WebSocket connected:', socket.id);
                setConnectionStatus('Open');
                setError(null);
                reconnectAttempts.current = 0;

                // Join the inventory admin room
                socket.emit(WEBSOCKET_CONFIG.EVENTS.JOIN_ROOM, WEBSOCKET_CONFIG.ROOMS.INVENTORY_ADMIN);
            });

            socket.on('message', handleWebSocketMessage);

            socket.on('room_joined', (data) => {
                console.log('Joined room:', data);
            });

            socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                setConnectionStatus('Error');
                setError(error);
            });

            socket.on('disconnect', (reason) => {
                console.log('WebSocket disconnected:', reason);
                setConnectionStatus('Closed');

                // Attempt to reconnect if not manually disconnected
                if (reason !== 'io client disconnect' && reconnectAttempts.current < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.current += 1;
                    console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})`);
                    
                    setTimeout(() => {
                        connect();
                    }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
                }
            });

        } catch (connectError) {
            console.error('Error creating WebSocket connection:', connectError);
            setError(connectError);
            setConnectionStatus('Error');
        }
    }, [handleWebSocketMessage]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
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

    // Initialize connection and sync orders on mount
    useEffect(() => {
        connect();
        syncOrders();

        return () => {
            disconnect();
        };
    }, [connect, disconnect, syncOrders]);

    return {
        orders,
        setOrders,
        newOrderAlerts,
        connectionStatus,
        error,
        isConnected: connectionStatus === 'Open',
        updateOrderStatus,
        syncOrders,
        clearAlert,
        clearAllAlerts,
        connect,
        disconnect
    };
};
