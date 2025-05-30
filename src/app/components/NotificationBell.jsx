import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useOrderNotifications } from '../../hooks/useOrderNotifications';

const NotificationBell = () => {
    const {
        notifications,
        unreadCount,
        isConnected,
        connectionError,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        reconnect
    } = useOrderNotifications();
    
    const [isOpen, setIsOpen] = useState(false);

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount);
    };

    const getNotificationIcon = (eventType) => {
        switch (eventType) {
            case 'new_order':
                return '🛒';
            case 'order_status_update':
                return '📦';
            default:
                return '📢';
        }
    };

    const getNotificationTitle = (notification) => {
        const { event, order } = notification.data || {};
        
        switch (event) {
            case 'new_order':
                return `New Order from ${order?.customerName || 'Customer'}`;
            case 'order_status_update':
                return `Order ${order?.orderId} Updated`;
            default:
                return 'New Notification';
        }
    };

    const getNotificationMessage = (notification) => {
        const { event, order } = notification.data || {};
        
        switch (event) {
            case 'new_order':
                return `Order #${order?.orderId} • ${formatCurrency(order?.total || 0)}`;
            case 'order_status_update':
                return `Status: ${order?.status || 'Unknown'}`;
            default:
                return 'New notification received';
        }
    };

    return (
        <div className="relative">
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                    isOpen 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
            >
                <Bell size={20} className={unreadCount > 0 ? 'animate-pulse' : ''} />
                
                {/* Unread Count Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                
                {/* Connection Status Indicator */}
                <div className="absolute -bottom-1 -right-1">
                    {isConnected ? (
                        <Wifi size={12} className="text-green-500" />
                    ) : (
                        <WifiOff size={12} className="text-red-500" />
                    )}
                </div>
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">
                                Notifications {unreadCount > 0 && `(${unreadCount})`}
                            </h3>
                            <div className="flex items-center gap-2">
                                {/* Connection Status */}
                                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                    isConnected 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {isConnected ? (
                                        <>
                                            <Wifi size={10} />
                                            <span>Live</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff size={10} />
                                            <span>Offline</span>
                                        </>
                                    )}
                                </div>
                                
                                {/* Close Button */}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Connection Error */}
                        {connectionError && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                                <AlertCircle size={12} />
                                <span>{connectionError}</span>
                                <button
                                    onClick={reconnect}
                                    className="ml-auto text-red-800 underline hover:no-underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        
                        {/* Action Buttons */}
                        {notifications.length > 0 && (
                            <div className="flex gap-2 mt-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        <CheckCheck size={12} />
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={clearAllNotifications}
                                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                                >
                                    <Trash2 size={12} />
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No notifications yet</p>
                                <p className="text-xs mt-1">You'll see new orders here in real-time</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className="text-2xl flex-shrink-0">
                                            {getNotificationIcon(notification.data?.event)}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 text-sm">
                                                        {getNotificationTitle(notification)}
                                                    </h4>
                                                    <p className="text-gray-600 text-xs mt-1">
                                                        {getNotificationMessage(notification)}
                                                    </p>
                                                </div>
                                                
                                                {/* Mark as read button */}
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                        title="Mark as read"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Timestamp */}
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-gray-400">
                                                    {formatTime(notification.timestamp)}
                                                </span>
                                                
                                                {/* Order details link */}
                                                {notification.data?.order?.orderId && (
                                                    <button className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                                                        View Order
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;