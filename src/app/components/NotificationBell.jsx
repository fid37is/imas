import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Package, ShoppingCart, Check, CheckCheck, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOrderUpdates } from '../../hooks/useOrderUpdates'; // Import your real hook

// Convert orders to notifications format
const useNotifications = () => {
    const { orders, connectionStatus, refreshConnection } = useOrderUpdates([]);
    const [notifications, setNotifications] = useState([]);
    const [readNotifications, setReadNotifications] = useState(new Set());

    // Convert new orders to notifications
    useEffect(() => {
        const newNotifications = orders.map(order => ({
            id: `order_${order.id}`,
            type: 'order',
            title: order.status === 'pending' ? 'New Order Received' : 'Order Status Updated',
            message: `Order #${order.orderId} from ${order.customerName}`,
            description: `Total: ${order.currency} ${order.total.toLocaleString()}`,
            timestamp: new Date(order.createdAt || order.updatedAt),
            read: readNotifications.has(`order_${order.id}`),
            order: order
        }));

        // Sort by newest first
        newNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(newNotifications);
    }, [orders, readNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = useCallback((notificationIds = null) => {
        if (notificationIds) {
            const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
            setReadNotifications(prev => {
                const newSet = new Set(prev);
                ids.forEach(id => {
                    // Store the notification ID as-is
                    newSet.add(id);
                });
                return newSet;
            });
        } else {
            // Mark all as read
            setReadNotifications(prev => {
                const newSet = new Set(prev);
                notifications.forEach(n => newSet.add(n.id));
                return newSet;
            });
        }
    }, [notifications]);

    return {
        notifications,
        unreadCount,
        connectionStatus,
        refreshConnection,
        markAsRead
    };
};

const NotificationBell = ({ onOrderSelect, setActiveView }) => {
    const { notifications, unreadCount, connectionStatus, refreshConnection, markAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    const handleNotificationClick = (notification) => {
        if (notification.order && onOrderSelect) {
            onOrderSelect(notification.order);
            if (setActiveView) {
                setActiveView("orders");
            }
        }
        markAsRead(notification.id);
        setIsOpen(false);
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'order':
                return <ShoppingCart className="w-4 h-4 text-blue-500" />;
            case 'inventory':
                return <Package className="w-4 h-4 text-orange-500" />;
            case 'success':
                return <Check className="w-4 h-4 text-green-600" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
            case 'error':
                return <X className="w-4 h-4 text-red-600" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    const getPaymentMethodDisplay = (paymentMethod) => {
        switch (paymentMethod) {
            case 'pay_on_delivery':
                return 'Pay on Delivery';
            case 'card':
                return 'Card Payment';
            case 'bank_transfer':
                return 'Bank Transfer';
            default:
                return paymentMethod;
        }
    };

    // Debug: Log connection status and notifications
    useEffect(() => {
        console.log('🔔 NotificationBell - Connection:', connectionStatus);
        console.log('🔔 NotificationBell - Notifications:', notifications.length);
        console.log('🔔 NotificationBell - Unread Count:', unreadCount);
    }, [connectionStatus, notifications, unreadCount]);

    return (
        <div className="relative">
            {/* Connection Status Indicator */}
            <div className="absolute -top-1 -left-1 z-10">
                {connectionStatus.connected ? (
                    <Wifi className="w-3 h-3 text-green-400" title="Connected to real-time updates" />
                ) : (
                    <WifiOff className="w-3 h-3 text-red-400" title="Disconnected from real-time updates" />
                )}
            </div>

            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-800 rounded-full transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 max-h-screen">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                        {unreadCount} unread
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAsRead()}
                                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck className="w-4 h-4 mr-1" />
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Connection Status */}
                        <div className={`px-4 py-2 text-xs border-b ${connectionStatus.connected
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                    {connectionStatus.connected ? (
                                        <>
                                            <Wifi className="w-3 h-3" />
                                            <span>Real-time updates active</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="w-3 h-3" />
                                            <span>Connection lost - attempting to reconnect...</span>
                                        </>
                                    )}
                                </div>
                                {!connectionStatus.connected && (
                                    <button
                                        onClick={refreshConnection}
                                        className="flex items-center space-x-1 text-xs hover:text-red-800 transition-colors"
                                        title="Retry connection"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Retry</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>No notifications yet</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        You'll see new orders and updates here
                                    </p>
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                        <p className="font-medium">Connection Status:</p>
                                        <p className={connectionStatus.connected ? 'text-green-600' : 'text-red-600'}>
                                            {connectionStatus.connected ? '✅ Connected' : '❌ Disconnected'}
                                        </p>
                                        {connectionStatus.reconnectAttempts > 0 && (
                                            <p className="text-gray-500">
                                                Reconnect attempts: {connectionStatus.reconnectAttempts}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read
                                                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'
                                                                }`}>
                                                                {notification.title}
                                                            </p>
                                                            <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-600'
                                                                }`}>
                                                                {notification.message}
                                                            </p>
                                                            {notification.description && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {notification.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {!notification.read && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    markAsRead(notification.id);
                                                                }}
                                                                className="flex-shrink-0 text-blue-600 hover:text-blue-700 ml-2 transition-colors"
                                                                title="Mark as read"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {notification.order && (
                                                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Customer:</span>
                                                                <span className="font-medium">{notification.order.customerName}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Total:</span>
                                                                <span className="font-medium">
                                                                    {notification.order.currency} {notification.order.total?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Payment:</span>
                                                                <span className="font-medium text-xs">
                                                                    {getPaymentMethodDisplay(notification.order.paymentMethod)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Status:</span>
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${notification.order.status === 'pending'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : notification.order.status === 'processing'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : notification.order.status === 'fulfilled'
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {notification.order.status}
                                                                </span>
                                                            </div>
                                                            {notification.order.items && notification.order.items.length > 0 && (
                                                                <div className="pt-1 border-t border-gray-200">
                                                                    <span className="text-gray-600">Items:</span>
                                                                    <div className="mt-1">
                                                                        {notification.order.items.slice(0, 2).map((item, idx) => (
                                                                            <div key={idx} className="text-xs text-gray-700">
                                                                                {item.quantity}x {item.name}
                                                                            </div>
                                                                        ))}
                                                                        {notification.order.items.length > 2 && (
                                                                            <div className="text-xs text-gray-500">
                                                                                +{notification.order.items.length - 2} more items
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs text-gray-400">
                                                            {formatTimeAgo(notification.timestamp)}
                                                        </span>
                                                        {notification.order && (
                                                            <span className="text-xs text-blue-600 font-medium">
                                                                Click to view order
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg text-center">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        if (setActiveView) {
                                            setActiveView("orders");
                                        }
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    View all in Order Management →
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;