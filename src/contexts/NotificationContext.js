// contexts/NotificationContext.js - Global notification state management
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import wsClient from '../lib/websocket-client';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState({
        connected: false,
        reconnectAttempts: 0
    });

    // Add new notification
    const addNotification = useCallback((notification) => {
        const newNotification = {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            read: false,
            ...notification
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Show toast notification
        const toastMessage = notification.message || notification.title;
        switch (notification.type) {
            case 'order':
                toast.success(toastMessage, {
                    description: notification.description,
                    action: notification.action
                });
                break;
            case 'warning':
            case 'inventory':
                toast.warning(toastMessage, {
                    description: notification.description
                });
                break;
            case 'error':
                toast.error(toastMessage, {
                    description: notification.description
                });
                break;
            default:
                toast.info(toastMessage, {
                    description: notification.description
                });
        }

        return newNotification;
    }, []);

    // Handle new order from WebSocket
    const handleNewOrder = useCallback((data) => {
        console.log('🆕 New order notification received:', data);
        
        if (data.data) {
            const orderData = data.data;
            addNotification({
                type: 'order',
                title: 'New Order Received',
                message: `Order ${orderData.orderId} from ${orderData.customerName}`,
                description: `Total: $${orderData.total}`,
                order: orderData,
                action: {
                    label: 'View Order',
                    onClick: () => {
                        // This will be handled by the component using the context
                        console.log('View order clicked:', orderData.id);
                    }
                }
            });
        }
    }, [addNotification]);

    // Handle order status updates
    const handleOrderStatusUpdate = useCallback((data) => {
        console.log('📝 Order status update notification:', data);
        
        if (data.data) {
            const updateData = data.data;
            addNotification({
                type: 'order',
                title: 'Order Status Updated',
                message: `Order ${updateData.orderId} status changed to ${updateData.status}`,
                description: updateData.trackingNumber ? `Tracking: ${updateData.trackingNumber}` : '',
                order: updateData
            });
        }
    }, [addNotification]);

    // Handle inventory alerts
    const handleInventoryAlert = useCallback((data) => {
        console.log('📦 Inventory alert:', data);
        
        if (data.data) {
            const inventoryData = data.data;
            addNotification({
                type: 'inventory',
                title: 'Low Stock Alert',
                message: `${inventoryData.productName} - Only ${inventoryData.quantity} left`,
                description: 'Consider restocking soon'
            });
        }
    }, [addNotification]);

    // Handle connection status changes
    const handleConnectionChange = useCallback((data) => {
        console.log('🔌 Connection status changed:', data);
        
        setConnectionStatus(prev => ({
            ...prev,
            connected: data.connected
        }));

        if (data.connected) {
            addNotification({
                type: 'success',
                title: 'Connected',
                message: 'Real-time updates enabled'
            });
        } else {
            addNotification({
                type: 'error',
                title: 'Connection Lost',
                message: 'Real-time updates disabled'
            });
        }
    }, [addNotification]);

    // Initialize WebSocket connection
    useEffect(() => {
        console.log('🚀 Initializing notification system');

        // Connect to WebSocket server
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
        wsClient.connect(wsUrl);

        // Set up event listeners
        wsClient.on('new_order', handleNewOrder);
        wsClient.on('order_status_update', handleOrderStatusUpdate);
        wsClient.on('inventory_alert', handleInventoryAlert);
        wsClient.on('connected', handleConnectionChange);
        wsClient.on('disconnected', handleConnectionChange);

        // Update initial connection status
        const status = wsClient.getConnectionStatus();
        setConnectionStatus(status);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up notification system');
            wsClient.off('new_order', handleNewOrder);
            wsClient.off('order_status_update', handleOrderStatusUpdate);
            wsClient.off('inventory_alert', handleInventoryAlert);
            wsClient.off('connected', handleConnectionChange);
            wsClient.off('disconnected', handleConnectionChange);
        };
    }, [handleNewOrder, handleOrderStatusUpdate, handleInventoryAlert, handleConnectionChange]);

    // Mark notifications as read
    const markAsRead = useCallback((notificationIds = null) => {
        if (notificationIds) {
            const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
            setNotifications(prev =>
                prev.map(notification =>
                    ids.includes(notification.id)
                        ? { ...notification, read: true }
                        : notification
                )
            );
        } else {
            // Mark all as read
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    }, []);

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Refresh WebSocket connection
    const refreshConnection = useCallback(() => {
        console.log('🔄 Refreshing WebSocket connection');
        wsClient.disconnect();
        setTimeout(() => {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
            wsClient.connect(wsUrl);
        }, 1000);
    }, []);

    const value = {
        notifications,
        unreadCount,
        connectionStatus,
        addNotification,
        markAsRead,
        clearNotifications,
        refreshConnection
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};