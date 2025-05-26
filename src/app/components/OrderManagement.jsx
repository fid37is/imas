import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import {
    Search,
    Filter,
    Eye,
    Edit3,
    Mail,
    Download,
    Calendar,
    User,
    Package,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Truck,
    X,
    ChevronDown
} from 'lucide-react';

// OrderManagement component
const OrderManagement = ({
    orders,
    setOrders,
    onUpdateOrderStatus,
    onResendEmail,
    inventory
}) => {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
        { value: 'fulfilled', label: 'Fulfilled', color: 'bg-green-100 text-green-800', icon: CheckCircle },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
    ];

    // Filter and search orders
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

            const matchesDate = dateFilter === 'all' ||
                (dateFilter === 'today' && new Date(order.orderDate).toDateString() === new Date().toDateString()) ||
                (dateFilter === 'week' && isWithinLastWeek(order.orderDate)) ||
                (dateFilter === 'month' && isWithinLastMonth(order.orderDate));

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, dateFilter]);

    const isWithinLastWeek = (date) => {
        const orderDate = new Date(date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
    };

    const isWithinLastMonth = (date) => {
        const orderDate = new Date(date);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDate >= monthAgo;
    };

    const getStatusInfo = (status) => {
        return statusOptions.find(option => option.value === status) || statusOptions[0];
    };

    const updateOrderStatus = async (orderId, newStatus, trackingNumber = '') => {
        try {
            await onUpdateOrderStatus(orderId, newStatus, trackingNumber);
            toast.success(`Order ${orderId} status updated to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update order status:', error);
            toast.error('Failed to update order status');
        }
    };

    const resendConfirmationEmail = async (order) => {
        try {
            await onResendEmail(order);
            toast.success('Confirmation email sent successfully!');
        } catch (error) {
            console.error('Failed to resend email:', error);
            toast.error('Failed to send email. Please try again.');
        }
    };

    const exportToCSV = () => {
        try {
            const headers = ['Order ID', 'Customer Name', 'Email', 'Date', 'Status', 'Total'];
            const csvContent = [
                headers.join(','),
                ...filteredOrders.map(order => [
                    order.orderId,
                    `"${order.customerName}"`,
                    order.customerEmail,
                    order.orderDate,
                    order.status,
                    order.total
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success('Orders exported to CSV successfully!');
        } catch (error) {
            console.error('Failed to export CSV:', error);
            toast.error('Failed to export orders');
        }
    };

    const checkInventoryAvailability = (orderItems) => {
        const unavailableItems = [];

        orderItems.forEach(orderItem => {
            const inventoryItem = inventory.find(item =>
                item.name === orderItem.name || item.sku === orderItem.sku
            );

            if (!inventoryItem || inventoryItem.quantity < orderItem.quantity) {
                unavailableItems.push(orderItem.name);
            }
        });

        return unavailableItems;
    };

    const StatusBadge = ({ status }) => {
        const statusInfo = getStatusInfo(status);
        const IconComponent = statusInfo.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {statusInfo.label}
            </span>
        );
    };

    StatusBadge.propTypes = {
        status: PropTypes.string.isRequired
    };

    const OrderDetailsModal = () => {
        if (!selectedOrder) return null;

        const unavailableItems = checkInventoryAvailability(selectedOrder.items);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                            <button
                                onClick={() => setShowOrderDetails(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {unavailableItems.length > 0 && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                                    <h3 className="text-red-800 font-semibold">Inventory Alert</h3>
                                </div>
                                <p className="text-red-700 text-sm">
                                    Insufficient inventory for: {unavailableItems.join(', ')}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <Package className="w-5 h-5 mr-2" />
                                    Order Information
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div><strong>Order ID:</strong> {selectedOrder.orderId}</div>
                                    <div><strong>Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString()}</div>
                                    <div><strong>Status:</strong> <StatusBadge status={selectedOrder.status} /></div>
                                    <div><strong>Payment:</strong>
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${selectedOrder.paymentStatus === 'paid'
                                                ? 'bg-green-100 text-green-800'
                                                : selectedOrder.paymentStatus === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {selectedOrder.paymentStatus}
                                        </span>
                                    </div>
                                    {selectedOrder.trackingNumber && (
                                        <div><strong>Tracking:</strong> {selectedOrder.trackingNumber}</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <User className="w-5 h-5 mr-2" />
                                    Customer Information
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div><strong>Name:</strong> {selectedOrder.customerName}</div>
                                    <div><strong>Email:</strong> {selectedOrder.customerEmail}</div>
                                    <div><strong>Shipping Address:</strong> {selectedOrder.shippingAddress}</div>
                                    {selectedOrder.notes && (
                                        <div><strong>Notes:</strong> {selectedOrder.notes}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items.map((item, index) => {
                                            const inventoryItem = inventory.find(inv =>
                                                inv.name === item.name || inv.sku === item.sku
                                            );
                                            const hasStock = inventoryItem && inventoryItem.quantity >= item.quantity;

                                            return (
                                                <tr key={index} className="border-t">
                                                    <td className="px-4 py-2 text-sm">{item.name}</td>
                                                    <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-sm">${item.price.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs ${hasStock
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {inventoryItem ? inventoryItem.quantity : 0} available
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 text-right">
                                <div className="text-lg font-semibold">
                                    Total: ${selectedOrder.total.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Update Status</h3>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map(status => (
                                    <button
                                        key={status.value}
                                        onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                                        disabled={unavailableItems.length > 0 && status.value === 'processing'}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedOrder.status === status.value
                                                ? 'bg-blue-600 text-white'
                                                : unavailableItems.length > 0 && status.value === 'processing'
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                            {unavailableItems.length > 0 && (
                                <p className="text-sm text-red-600 mt-2">
                                    Cannot process order due to insufficient inventory
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => resendConfirmationEmail(selectedOrder)}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Resend Email
                            </button>

                            {selectedOrder.status === 'processing' && unavailableItems.length === 0 && (
                                <button
                                    onClick={() => {
                                        const tracking = prompt('Enter tracking number:');
                                        if (tracking) {
                                            updateOrderStatus(selectedOrder.id, 'fulfilled', tracking);
                                        }
                                    }}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Truck className="w-4 h-4 mr-2" />
                                    Mark as Shipped
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
                    <p className="text-gray-600">Manage and track your orders</p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search orders, customers, or emails..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                            onClick={exportToCSV}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </button>
                    </div>

                    {showFilters && (
                        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="all">All Statuses</option>
                                    {statusOptions.map(status => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Orders Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {statusOptions.map(status => {
                        const count = orders.filter(order => order.status === status.value).length;
                        const IconComponent = status.icon;

                        return (
                            <div key={status.value} className="bg-white rounded-lg shadow-sm p-6">
                                <div className="flex items-center">
                                    <div className={`p-3 rounded-lg ${status.color.replace('text-', 'bg-').replace('-800', '-500')}`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{status.label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {order.orderId}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                                                <div className="text-sm text-gray-500">{order.customerEmail}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(order.orderDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${order.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setShowOrderDetails(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <select
                                                    value={order.status}
                                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {statusOptions.map(status => (
                                                        <option key={status.value} value={status.value}>{status.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredOrders.length === 0 && (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No orders found matching your criteria.</p>
                        </div>
                    )}
                </div>

                {/* Order Details Modal */}
                {showOrderDetails && <OrderDetailsModal />}
            </div>
        </div>
    );
};

// PropTypes for runtime type checking
OrderManagement.propTypes = {
    orders: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            orderId: PropTypes.string.isRequired,
            customerName: PropTypes.string.isRequired,
            customerEmail: PropTypes.string.isRequired,
            orderDate: PropTypes.string.isRequired,
            status: PropTypes.oneOf(['pending', 'processing', 'fulfilled', 'cancelled']).isRequired,
            total: PropTypes.number.isRequired,
            items: PropTypes.arrayOf(
                PropTypes.shape({
                    name: PropTypes.string.isRequired,
                    quantity: PropTypes.number.isRequired,
                    price: PropTypes.number.isRequired,
                    sku: PropTypes.string
                })
            ).isRequired,
            shippingAddress: PropTypes.string.isRequired,
            paymentStatus: PropTypes.oneOf(['pending', 'paid', 'failed']).isRequired,
            notes: PropTypes.string,
            trackingNumber: PropTypes.string,
            userId: PropTypes.string.isRequired
        })
    ).isRequired,
    setOrders: PropTypes.func.isRequired,
    onUpdateOrderStatus: PropTypes.func.isRequired,
    onResendEmail: PropTypes.func.isRequired,
    inventory: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            category: PropTypes.string.isRequired,
            quantity: PropTypes.number.isRequired,
            price: PropTypes.number.isRequired,
            sku: PropTypes.string,
            costPrice: PropTypes.number,
            lastUpdated: PropTypes.string,
            lowStockThreshold: PropTypes.number.isRequired,
            imageUrl: PropTypes.string,
            imageId: PropTypes.string
        })
    ).isRequired
};

export default OrderManagement;