// Inventory App - /pages/admin/orders.js
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import OrderManagement from '../../components/OrderManagement';
import { getRowsFromSheet } from '../../lib/environmentAwareClientSheetsService';
import { useOrderUpdates } from '../../hooks/useOrderUpdates';

const AdminOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use the order updates hook for real-time updates
    useOrderUpdates({
        onNewOrder: (orderData) => {
            console.log('New order received:', orderData);
            // Add new order to the beginning of the list
            setOrders(prevOrders => [orderData.order, ...prevOrders]);
            toast.success(`New order received: ${orderData.order.orderId}`);
        },
        onOrderUpdate: (updateData) => {
            console.log('Order update received:', updateData);
            // Update existing order
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.orderId === updateData.orderId 
                        ? { ...order, ...updateData.order }
                        : order
                )
            );
            toast.info(`Order ${updateData.orderId} updated to ${updateData.newStatus}`);
        }
    });

    // Fetch initial orders data
    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch orders from Google Sheets
            const ordersData = await getRowsFromSheet('Orders!A:M');
            
            if (ordersData && ordersData.length > 0) {
                // Skip header row and transform data
                const transformedOrders = ordersData.slice(1).map(row => ({
                    id: row[0] || '',
                    orderId: row[1] || '',
                    userId: row[2] || '',
                    customerName: row[3] || '',
                    customerEmail: row[4] || '',
                    status: row[5] || 'pending',
                    total: parseFloat(row[6]) || 0,
                    orderDate: row[7] || '',
                    shippingAddress: row[8] || '',
                    paymentStatus: row[9] || 'pending',
                    notes: row[10] || '',
                    updatedAt: row[11] || '',
                    trackingNumber: row[12] || '',
                    items: [] // Will be populated from OrderItems sheet
                }));

                // Fetch order items for each order
                const orderItemsData = await getRowsFromSheet('OrderItems!A:H');
                
                if (orderItemsData && orderItemsData.length > 0) {
                    // Skip header row and group items by orderId
                    const itemsMap = {};
                    orderItemsData.slice(1).forEach(item => {
                        const orderId = item[1]; // Column B = orderId
                        if (!itemsMap[orderId]) {
                            itemsMap[orderId] = [];
                        }
                        itemsMap[orderId].push({
                            id: item[0] || '',
                            orderId: item[1] || '',
                            productId: item[2] || '',
                            name: item[3] || '',
                            quantity: parseInt(item[4]) || 0,
                            price: parseFloat(item[5]) || 0,
                            sku: item[6] || '',
                            imageUrl: item[7] || ''
                        });
                    });

                    // Add items to orders
                    transformedOrders.forEach(order => {
                        order.items = itemsMap[order.orderId] || [];
                    });
                }

                // Sort orders by date (newest first)
                transformedOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                
                setOrders(transformedOrders);
            }

        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Failed to load orders. Please try again.');
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    // Fetch inventory data
    const fetchInventory = async () => {
        try {
            const inventoryData = await getRowsFromSheet('Inventory!A:J');
            
            if (inventoryData && inventoryData.length > 0) {
                // Skip header row and transform data
                const transformedInventory = inventoryData.slice(1).map(row => ({
                    id: row[0] || '',
                    name: row[1] || '',
                    category: row[2] || '',
                    quantity: parseInt(row[3]) || 0,
                    price: parseFloat(row[4]) || 0,
                    sku: row[5] || '',
                    costPrice: parseFloat(row[6]) || 0,
                    lastUpdated: row[7] || '',
                    lowStockThreshold: parseInt(row[8]) || 5,
                    imageUrl: row[9] || ''
                }));

                setInventory(transformedInventory);
            }

        } catch (err) {
            console.error('Error fetching inventory:', err);
            toast.error('Failed to load inventory data');
        }
    };

    // Update order status
    const handleUpdateOrderStatus = async (orderId, newStatus, trackingNumber = '') => {
        try {
            const orderToUpdate = orders.find(order => order.orderId === orderId);
            
            if (!orderToUpdate) {
                throw new Error('Order not found');
            }

            const response = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    newStatus,
                    trackingNumber,
                    orderDetails: orderToUpdate
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update order status');
            }

            // Update local state
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

            return data;

        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    };

    // Resend confirmation email
    const handleResendEmail = async (order) => {
        try {
            const response = await fetch('/api/orders/resend-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend email');
            }

            return data;

        } catch (error) {
            console.error('Error resending email:', error);
            throw error;
        }
    };

    // Load data on component mount
    useEffect(() => {
        fetchOrders();
        fetchInventory();
    }, []);

    // Auto-refresh orders every 5 minutes (fallback for websocket)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchOrders();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            fetchOrders();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Connection Status Indicator */}
            <div className="bg-white border-b border-gray-200 px-6 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600">Real-time updates active</span>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        Refresh Orders
                    </button>
                </div>
            </div>

            <OrderManagement
                orders={orders}
                setOrders={setOrders}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onResendEmail={handleResendEmail}
                inventory={inventory}
            />
        </div>
    );
};

export default AdminOrdersPage;