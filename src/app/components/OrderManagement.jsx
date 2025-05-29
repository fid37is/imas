import React, { useState, useEffect, useCallback } from 'react';
import {
    getOrdersWithItems,
    getOrderStats,
    updateOrderStatusInSheet
} from '../utils/inventoryService';
import {
    Package,
    Search,
    Filter,
    Eye,
    Edit,
    Calendar,
    User,
    CreditCard,
    MapPin,
    Phone,
    Mail,
    Clock,
    DollarSign,
    ShoppingCart,
    Truck,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw
} from 'lucide-react';

// Custom Loading Screen Component
const CustomLoader = () => (
    <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
        </div>
    </div>
);

const OrdersManagement = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [orderStats, setOrderStats] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState({});

    // Fetch data function with error handling
    const fetchData = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            else setRefreshing(true);
            
            const [ordersData, statsData] = await Promise.all([
                getOrdersWithItems(),
                getOrderStats()
            ]);
            
            // Sort orders by date (newest first)
            const sortedOrders = ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            
            setOrders(sortedOrders);
            setFilteredOrders(sortedOrders);
            setOrderStats(statsData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // You might want to show a toast notification here
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh every 30 seconds to get new orders from sheets
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(false); // Refresh without showing loader
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [fetchData]);

    // Filter orders based on search term, status, and date range
    useEffect(() => {
        let filtered = orders;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${order.customerFirstName} ${order.customerLastName}`.toLowerCase().includes(searchTerm.toLowerCase())
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
    }, [orders, searchTerm, statusFilter, dateRange, customDateRange]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'processing': return <Package className="w-4 h-4 text-blue-500" />;
            case 'shipped': return <Truck className="w-4 h-4 text-purple-500" />;
            case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            case 'shipped': return 'bg-purple-100 text-purple-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
            
            // Update in Google Sheets first
            await updateOrderStatusInSheet(orderId, newStatus);
            
            // Update local state after successful sheet update
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.orderId === orderId
                        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
                        : order
                )
            );
            
            // Update selected order if it's currently viewed
            if (selectedOrder && selectedOrder.orderId === orderId) {
                setSelectedOrder(prev => ({ ...prev, status: newStatus }));
            }
            
        } catch (error) {
            console.error('Error updating order status:', error);
            // You might want to show an error toast here
            alert('Failed to update order status. Please try again.');
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
        }
    };

    const formatCurrency = (amount, currency = 'NGN') => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            {orderStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{orderStats.overview.totalOrders}</p>
                            </div>
                            <ShoppingCart className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(orderStats.overview.totalRevenue)}
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
                                    {formatCurrency(orderStats.overview.averageOrderValue)}
                                </p>
                            </div>
                            <Package className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Items Sold</p>
                                <p className="text-2xl font-bold text-gray-900">{orderStats.overview.totalItemsSold}</p>
                            </div>
                            <Truck className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search orders by ID, customer name, or email..."
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                    {/* Custom Date Range Inputs */}
                    {dateRange === 'custom' && (
                        <>
                            <input
                                type="date"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                placeholder="Start Date"
                            />
                            <input
                                type="date"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                placeholder="End Date"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Order ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.map((order) => (
                                <tr key={order.orderId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{order.orderId}</div>
                                        <div className="text-sm text-gray-500">{order.paymentMethod}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="ml-0">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.customerFirstName} {order.customerLastName}
                                                </div>
                                                <div className="text-sm text-gray-500">{order.customerEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(order.orderDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {getStatusIcon(order.status)}
                                            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatCurrency(order.totalAmount)}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            +{formatCurrency(order.shippingFee)} shipping
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {order.items?.length || 0} items
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setShowOrderDetails(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <div className="relative">
                                                {updatingStatus[order.orderId] && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                                    </div>
                                                )}
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
                                                    className="text-xs border border-gray-300 rounded px-2 py-1 min-w-[100px]"
                                                    disabled={updatingStatus[order.orderId]}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredOrders.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search or filter criteria.
                        </p>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                                <button
                                    onClick={() => setShowOrderDetails(false)}
                                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Order Information */}
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Order ID:</span>
                                                <span className="font-medium">{selectedOrder.orderId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Date:</span>
                                                <span className="font-medium">{formatDate(selectedOrder.orderDate)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Status:</span>
                                                <div className="flex items-center">
                                                    {getStatusIcon(selectedOrder.status)}
                                                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                                                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Payment Method:</span>
                                                <span className="font-medium">{selectedOrder.paymentMethod.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Account Type:</span>
                                                <span className="font-medium">
                                                    {selectedOrder.isAuthenticated ? 'Registered User' : 'Guest Checkout'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Information */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 text-gray-400 mr-2" />
                                                <span>{selectedOrder.customerFirstName} {selectedOrder.customerLastName}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                                <span>{selectedOrder.customerEmail}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                                <span>{selectedOrder.customerPhone}</span>
                                            </div>
                                            <div className="flex items-start">
                                                <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                                                <div>
                                                    <div>{selectedOrder.shippingAddress}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {selectedOrder.town}, {selectedOrder.lga}, {selectedOrder.city}, {selectedOrder.state} {selectedOrder.zip}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedOrder.additionalInfo && (
                                                <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                                                    <strong>Note:</strong> {selectedOrder.additionalInfo}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Order Items and Summary */}
                                <div className="space-y-6">
                                    {/* Order Items */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                                        <div className="space-y-3">
                                            {selectedOrder.items?.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white p-3 rounded">
                                                    <div className="flex items-center">
                                                        <img
                                                            src={item.imageUrl || 'https://via.placeholder.com/40'}
                                                            alt={item.productName}
                                                            className="w-10 h-10 rounded object-cover mr-3"
                                                        />
                                                        <div>
                                                            <div className="font-medium">{item.productName}</div>
                                                            <div className="text-sm text-gray-500">ID: {item.productId}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium">{formatCurrency(item.price)} × {item.quantity}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {formatCurrency(item.price * item.quantity)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Order Summary */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span>{formatCurrency(selectedOrder.totalAmount - selectedOrder.shippingFee)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Shipping:</span>
                                                <span>{formatCurrency(selectedOrder.shippingFee)}</span>
                                            </div>
                                            <div className="border-t pt-2 mt-2">
                                                <div className="flex justify-between font-bold text-lg">
                                                    <span>Total:</span>
                                                    <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersManagement;
                        