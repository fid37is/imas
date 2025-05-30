import React, { useState, useEffect, useCallback } from 'react';
import {
    getOrdersWithItems,
    getOrderStats,
    updateOrderStatusInSheet // Using the utility function instead of API call
} from '../utils/inventoryService';
import {
    Package,
    Search,
    Filter,
    Calendar,
    ShoppingCart,
    DollarSign,
    Truck,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import OrdersTable from './OrderTable';

// Custom Loading Component
const CustomLoader = () => {
    const letters = 'skeepr'.split('');

    return (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
                <div className="flex space-x-2">
                    {letters.map((letter, index) => (
                        <span 
                            key={index} 
                            className="text-6xl font-bold text-primary-500 inline-block"
                            style={{
                                animation: `wave 1s ease-in-out infinite`,
                                animationDelay: `${index * 0.15}s`
                            }}
                        >
                            {letter}
                        </span>
                    ))}
                </div>
            </div>
            <style jsx>{`
                @keyframes wave {
                    0%, 60%, 100% {
                        transform: translateY(0);
                    }
                    30% {
                        transform: translateY(-20px);
                    }
                }
            `}</style>
        </div>
    );
};



const OrdersManagement = ({ 
    orders = [], 
    setOrders = null, 
    onUpdateOrderStatus = null, 
    onResendEmail = null, 
    inventory = [] 
}) => {
    const [internalOrders, setInternalOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [orderStats, setOrderStats] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState({});

    // Use prop orders if provided, otherwise use internal state
    const currentOrders = orders.length > 0 ? orders : internalOrders;
    const setCurrentOrders = setOrders || setInternalOrders;

    // Show notification using Sonner
    const showNotification = (message, type = 'success') => {
        if (type === 'success') {
            toast.success(message);
        } else {
            toast.error(message);
        }
    };

    // Fetch data
    const fetchData = useCallback(async (showLoader = true) => {
        if (orders.length > 0) {
            setLoading(false);
            return;
        }

        try {
            if (showLoader) setLoading(true);
            else setRefreshing(true);
            
            const [ordersData, statsData] = await Promise.all([
                getOrdersWithItems(),
                getOrderStats()
            ]);
            
            // Sort orders by date (newest first)
            const sortedOrders = ordersData.sort((a, b) => 
                new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
            );
            
            setCurrentOrders(sortedOrders);
            setOrderStats(statsData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            showNotification('Failed to fetch orders. Please try again.', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orders.length, setCurrentOrders]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh every 30 seconds (only if not using prop orders)
    useEffect(() => {
        if (orders.length > 0) return;

        const interval = setInterval(() => {
            fetchData(false);
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchData, orders.length]);

    // Filter orders
    useEffect(() => {
        let filtered = [...currentOrders];

        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(order =>
                order.orderId?.toLowerCase().includes(searchLower) ||
                order.customerEmail?.toLowerCase().includes(searchLower) ||
                order.customerName?.toLowerCase().includes(searchLower) ||
                `${order.customerFirstName || ''} ${order.customerLastName || ''}`.toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Date range filter
        if (dateRange !== 'all') {
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date();

            switch (dateRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'yesterday':
                    startDate.setDate(now.getDate() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setDate(now.getDate() - 1);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case '3months':
                    startDate.setMonth(now.getMonth() - 3);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'custom':
                    if (customDateRange.start && customDateRange.end) {
                        startDate = new Date(customDateRange.start);
                        startDate.setHours(0, 0, 0, 0);
                        endDate = new Date(customDateRange.end);
                        endDate.setHours(23, 59, 59, 999);
                    } else {
                        startDate = new Date(0);
                        endDate = new Date();
                    }
                    break;
                default:
                    startDate = new Date(0);
            }

            filtered = filtered.filter(order => {
                const orderDate = new Date(order.orderDate);
                return orderDate >= startDate && (dateRange === 'custom' ? orderDate <= endDate : true);
            });
        }

        setFilteredOrders(filtered);
    }, [currentOrders, searchTerm, statusFilter, dateRange, customDateRange]);

    // Enhanced status update function
    const handleStatusUpdate = async (orderId, newStatus, trackingNumber) => {
        try {
            setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
            
            let updateResult;
            
            if (onUpdateOrderStatus) {
                // Use custom update function if provided
                updateResult = await onUpdateOrderStatus(orderId, newStatus, trackingNumber);
            } else {
                // Use the utility function directly instead of API call
                updateResult = await updateOrderStatusInSheet(orderId, newStatus, trackingNumber);
            }
            
            if (updateResult.success !== false) { // Assuming success if not explicitly false
                // Update local state immediately for better UX
                const updateOrderInState = (prevOrders) => {
                    return prevOrders.map(order =>
                        order.orderId === orderId
                            ? { 
                                ...order, 
                                status: newStatus, 
                                trackingNumber: trackingNumber || order.trackingNumber,
                                updatedAt: new Date().toISOString() 
                              }
                            : order
                    );
                };
                
                if (orders.length > 0 && setOrders) {
                    setOrders(updateOrderInState);
                } else {
                    setInternalOrders(updateOrderInState);
                }
                
                showNotification(
                    `Order ${orderId} status updated to ${newStatus.toUpperCase()}`, 
                    'success'
                );
                
                // Optionally refresh data to ensure consistency
                setTimeout(() => {
                    fetchData(false);
                }, 1000);
                
            } else {
                throw new Error(updateResult.error || 'Failed to update status');
            }
            
        } catch (error) {
            console.error('Error updating order status:', error);
            showNotification(
                `Failed to update order ${orderId}: ${error.message}`, 
                'error'
            );
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
        }
    };

    const formatCurrency = (amount, currency = 'NGN') => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    };

    const handleRefresh = () => {
        fetchData(false);
    };

    if (loading) {
        return <CustomLoader />;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders Management</h1>
                    <p className="text-gray-600">Manage and track your customer orders</p>
                </div>
                {orders.length === 0 && (
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            {orderStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{orderStats.overview?.totalOrders || 0}</p>
                            </div>
                            <ShoppingCart className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(orderStats.overview?.totalRevenue || 0)}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(orderStats.overview?.averageOrderValue || 0)}
                                </p>
                            </div>
                            <Package className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Items Sold</p>
                                <p className="text-2xl font-bold text-gray-900">{orderStats.overview?.totalItemsSold || 0}</p>
                            </div>
                            <Truck className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded shadow-sm border mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search orders by ID, customer name, or email..."
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            className="pl-10 pr-8 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            className="pl-10 pr-8 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="3months">Last 3 Months</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    {dateRange === 'custom' && (
                        <>
                            <input
                                type="date"
                                className="px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                            <input
                                type="date"
                                className="px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-accent-500 focus:border-transparent"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            <OrdersTable
                orders={filteredOrders}
                onStatusUpdate={handleStatusUpdate}
                onResendEmail={onResendEmail}
                updatingStatus={updatingStatus}
                formatCurrency={formatCurrency}
                inventory={inventory}
                loading={refreshing}
            />
        </div>
    );
};

export default OrdersManagement;