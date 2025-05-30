// hooks/useOrderNotifications.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export const useOrderNotifications = (options = {}) => {
    const {
        autoConnect = true,
        reconnectInterval = 5000,
        maxReconnectAttempts = 5,
        endpoint = '/api/order-notifications'
    } = options;

    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const eventSourceRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeoutRef = useRef(null);

    // Connect to SSE
    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setConnectionStatus('connecting');
        setError(null);

        try {
            const eventSource = new EventSource(endpoint);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ SSE Connected');
                setIsConnected(true);
                setConnectionStatus('connected');
                setError(null);
                reconnectAttempts.current = 0;
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    switch (data.type) {
                        case 'connected':
                            console.log('Connected to notifications:', data.message);
                            break;
                            
                        case 'heartbeat':
                            // Silent heartbeat - just keep connection alive
                            break;
                            
                        case 'NEW_ORDER':
                            console.log('📦 New order notification:', data);
                            const newNotification = {
                                id: `${Date.now()}-${Math.random()}`,
                                ...data,
                                read: false,
                                receivedAt: new Date().toISOString()
                            };
                            
                            setNotifications(prev => [newNotification, ...prev]);
                            setUnreadCount(prev => prev + 1);
                            
                            // Show browser notification if permission granted
                            if (Notification.permission === 'granted') {
                                new Notification('New Order Received!', {
                                    body: `Order from ${data.customerName} - $${data.total}`,
                                    icon: '/favicon.ico',
                                    tag: data.orderId
                                });
                            }
                            break;
                            
                        case 'ORDER_STATUS_UPDATE':
                            console.log('📋 Order status update:', data);
                            const statusNotification = {
                                id: `${Date.now()}-${Math.random()}`,
                                ...data,
                                read: false,
                                receivedAt: new Date().toISOString()
                            };
                            
                            setNotifications(prev => [statusNotification, ...prev]);
                            setUnreadCount(prev => prev + 1);
                            break;
                            
                        default:
                            console.log('Unknown notification type:', data.type);
                    }
                } catch (error) {
                    console.error('Error parsing notification:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE Error:', error);
                setIsConnected(false);
                setConnectionStatus('error');
                setError('Connection error');
                
                // Attempt to reconnect
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    setConnectionStatus('reconnecting');
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts.current})`);
                        connect();
                    }, reconnectInterval);
                } else {
                    setConnectionStatus('failed');
                    setError('Max reconnection attempts reached');
                }
            };

        } catch (error) {
            console.error('Failed to create EventSource:', error);
            setError(error.message);
            setConnectionStatus('failed');
        }
    }, [endpoint, reconnectInterval, maxReconnectAttempts]);

    // Disconnect from SSE
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setError(null);
        reconnectAttempts.current = 0;
    }, []);

    // Mark notification as read
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev => 
            prev.map(notification => 
                notification.id === notificationId 
                    ? { ...notification, read: true }
                    : notification
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => 
            prev.map(notification => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
    }, []);

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    // Clear a specific notification
    const clearNotification = useCallback((notificationId) => {
        setNotifications(prev => {
            const notification = prev.find(n => n.id === notificationId);
            const filtered = prev.filter(n => n.id !== notificationId);
            
            if (notification && !notification.read) {
                setUnreadCount(prevCount => Math.max(0, prevCount - 1));
            }
            
            return filtered;
        });
    }, []);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, [requestNotificationPermission]);

    return {
        // State
        notifications,
        isConnected,
        connectionStatus,
        error,
        unreadCount,
        
        // Actions
        connect,
        disconnect,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        clearNotification,
        requestNotificationPermission,
        
        // Status helpers
        hasUnread: unreadCount > 0,
        isConnecting: connectionStatus === 'connecting',
        isReconnecting: connectionStatus === 'reconnecting',
        hasError: !!error
    };
};