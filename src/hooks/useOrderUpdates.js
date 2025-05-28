// hooks/useOrderUpdates.js - React hook for real-time order management
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import wsClient from '../lib/websocket-client';

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
                
                // Show notification
                toast.success(`New order received: ${data.data.orderId}`, {
                    description: `From ${data.data.customerName} - $${data.data.total}`,
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
                            description: `Status changed to ${data.data.status}`
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
        setConnectionStatus(prev => ({
            ...prev,
            connected: data.connected
        }));

        if (data.connected) {
            toast.success('Connected to real-time updates');
        } else {
            toast.error('Lost connection to real-time updates');
        }
    }, []);

    // Initialize WebSocket connection and event listeners
    useEffect(() => {
        console.log('🔌 Initializing WebSocket connection for order updates');

        // Connect to WebSocket
        wsClient.connect('ws://localhost:3002');

        // Set up event listeners
        wsClient.on('new_order', handleNewOrder);
        wsClient.on('order_status_update', handleOrderStatusUpdate);
        wsClient.on('connected', handleConnectionChange);
        wsClient.on('disconnected', handleConnectionChange);

        // Update connection status
        const status = wsClient.getConnectionStatus();
        setConnectionStatus(status);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up WebSocket listeners');
            wsClient.off('new_order', handleNewOrder);
            wsClient.off('order_status_update', handleOrderStatusUpdate);
            wsClient.off('connected', handleConnectionChange);
            wsClient.off('disconnected', handleConnectionChange);
        };
    }, [handleConnectionChange, handleNewOrder, handleOrderStatusUpdate]); // Empty dependency array - only run once

    // Update orders when initialOrders prop changes
    useEffect(() => {
        if (initialOrders.length > 0) {
            setOrders(initialOrders);
        }
    }, [initialOrders]);

    // Function to manually refresh connection
    const refreshConnection = useCallback(() => {
        wsClient.disconnect();
        setTimeout(() => {
            wsClient.connect('ws://localhost:3002');
        }, 1000);
    }, []);

    return {
        orders,
        setOrders,
        connectionStatus,
        refreshConnection
    };
};