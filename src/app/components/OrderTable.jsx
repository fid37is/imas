import React, { useState, useRef, useEffect } from 'react';
import { 
    Edit, 
    Eye, 
    Mail, 
    Package, 
    Truck, 
    CheckCircle, 
    XCircle,
    Clock,
    AlertTriangle,
    ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatOrderStatus, validateStatusTransition } from '../utils/inventoryService';

const StatusBadge = ({ status }) => {
    const statusConfig = formatOrderStatus(status);
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border`}>
            {statusConfig.label}
        </span>
    );
};

const CancelConfirmationModal = ({ order, isOpen, onConfirm, onCancel, isProcessing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                </div>
                
                <div className="mb-6 text-left">
                    <p className="text-sm text-gray-600 mb-3">
                        Are you sure you want to cancel this order? <br/>This action cannot be undone.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-900">Order: {order?.orderId}</p>
                        <p className="text-sm text-gray-600">
                            Customer: {order?.customerName || `${order?.customerFirstName || ''} ${order?.customerLastName || ''}`.trim()}
                        </p>
                        <p className="text-sm text-gray-600">Status: {order?.status}</p>
                    </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Keep Order
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Cancelling...
                            </>
                        ) : (
                            <>
                                Cancel Order
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatusDropdown = ({ order, onUpdateStatus, updatingStatus }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || '');
    const [showTrackingInput, setShowTrackingInput] = useState(false);
    const [pendingStatus, setPendingStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
    
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    const statusOptions = [
        { value: 'pending', label: 'Pending', icon: Clock },
        { value: 'processing', label: 'Processing', icon: Package },
        { value: 'shipped', label: 'Shipped', icon: Truck },
        { value: 'delivered', label: 'Delivered', icon: CheckCircle },
        { value: 'cancelled', label: 'Cancelled', icon: XCircle }
    ];

    const calculateDropdownPosition = () => {
        if (!buttonRef.current) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const dropdownHeight = 200; // Approximate dropdown height
        const dropdownWidth = 192; // w-48 = 12rem = 192px

        // Calculate available space
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const spaceRight = viewportWidth - buttonRect.left;

        // Determine vertical placement
        const shouldPlaceAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
        
        // Calculate position
        let top, left;
        
        if (shouldPlaceAbove) {
            top = buttonRect.top - dropdownHeight - 4; // 4px gap
        } else {
            top = buttonRect.bottom + 4; // 4px gap
        }

        // Horizontal positioning - align to right edge of button
        left = buttonRect.right - dropdownWidth;
        
        // Ensure dropdown doesn't go off screen
        if (left < 8) { // 8px margin from edge
            left = 8;
        }
        if (left + dropdownWidth > viewportWidth - 8) {
            left = viewportWidth - dropdownWidth - 8;
        }

        setDropdownPosition({
            top,
            left,
            placement: shouldPlaceAbove ? 'top' : 'bottom'
        });
    };

    const handleDropdownToggle = (e) => {
        if (!isOpen) {
            calculateDropdownPosition();
        }
        setIsOpen(!isOpen);
    };

    // Recalculate position on window resize or scroll
    useEffect(() => {
        if (isOpen) {
            const handleResize = () => calculateDropdownPosition();
            const handleScroll = () => calculateDropdownPosition();
            
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleScroll, true);
            
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isOpen]);

    const handleStatusChange = async (newStatus) => {
        // Special handling for cancellation
        if (newStatus === 'cancelled') {
            setIsOpen(false);
            setShowCancelConfirm(true);
            return;
        }

        // Validate status transition
        const validation = validateStatusTransition(order.status, newStatus);
        
        if (!validation.valid) {
            toast.error(validation.error);
            setIsOpen(false);
            return;
        }

        if (validation.warning) {
            toast.warning(validation.warning);
        }

        // If changing to shipped and no tracking number, show input
        if (newStatus === 'shipped' && !trackingNumber && !order.trackingNumber) {
            setPendingStatus(newStatus);
            setShowTrackingInput(true);
            return;
        }

        setIsProcessing(true);
        try {
            await onUpdateStatus(order.orderId, newStatus, trackingNumber);
            toast.success(`Order status updated to ${statusOptions.find(s => s.value === newStatus)?.label}`);
            setIsOpen(false);
            setShowTrackingInput(false);
            setPendingStatus(null);
        } catch (error) {
            toast.error('Failed to update order status');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelConfirm = async () => {
        setIsProcessing(true);
        try {
            await onUpdateStatus(order.orderId, 'cancelled');
            toast.success('Order has been cancelled');
            setShowCancelConfirm(false);
        } catch (error) {
            toast.error('Failed to cancel order');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTrackingSubmit = async () => {
        if (pendingStatus) {
            setIsProcessing(true);
            try {
                await onUpdateStatus(order.orderId, pendingStatus, trackingNumber);
                toast.success(`Order status updated to ${statusOptions.find(s => s.value === pendingStatus)?.label}`);
                setShowTrackingInput(false);
                setPendingStatus(null);
                setIsOpen(false);
            } catch (error) {
                toast.error('Failed to update order status');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const isCurrentlyUpdating = updatingStatus[order.orderId] || isProcessing;

    return (
        <>
            <div className="relative">
                <button
                    ref={buttonRef}
                    onClick={handleDropdownToggle}
                    disabled={isCurrentlyUpdating}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Update Status"
                >
                    {isCurrentlyUpdating ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-600 border-t-transparent mr-1"></div>
                    ) : (
                        <Edit className="w-3 h-3 mr-1" />
                    )}
                    {isCurrentlyUpdating ? 'Updating...' : 'Status'}
                    {!isCurrentlyUpdating && <ChevronDown className="w-3 h-3 ml-1" />}
                </button>
            </div>

            {/* Portal-style dropdown positioned absolutely to viewport */}
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => {
                            if (!isProcessing) {
                                setIsOpen(false);
                                setShowTrackingInput(false);
                                setPendingStatus(null);
                            }
                        }}
                    />
                    <div 
                        ref={dropdownRef}
                        className="fixed z-20 w-48 bg-white border border-gray-200 rounded-md shadow-lg"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                        }}
                    >
                        {!showTrackingInput ? (
                            <div className="py-1">
                                {statusOptions.map(option => {
                                    const Icon = option.icon;
                                    const isCurrentStatus = option.value === order.status;
                                    const isCancelled = option.value === 'cancelled';
                                    
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => handleStatusChange(option.value)}
                                            disabled={isCurrentStatus || isProcessing}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                isCurrentStatus ? 'bg-gray-50 font-medium' : ''
                                            } ${isCancelled ? 'text-red-600 hover:bg-red-50' : ''}`}
                                        >
                                            <Icon className={`w-4 h-4 mr-2 ${isCancelled ? 'text-red-500' : ''}`} />
                                            {option.label}
                                            {isCurrentStatus && (
                                                <span className="ml-auto text-xs text-gray-500">(current)</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Add Tracking Number (Optional)
                                </p>
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number"
                                    disabled={isProcessing}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-accent-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoFocus
                                />
                                <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                        onClick={() => {
                                            if (!isProcessing) {
                                                setShowTrackingInput(false);
                                                setPendingStatus(null);
                                            }
                                        }}
                                        disabled={isProcessing}
                                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTrackingSubmit}
                                        disabled={isProcessing}
                                        className="px-2 py-1 text-xs bg-primary-700 text-white rounded hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <CancelConfirmationModal
                order={order}
                isOpen={showCancelConfirm}
                onConfirm={handleCancelConfirm}
                onCancel={() => setShowCancelConfirm(false)}
                isProcessing={isProcessing}
            />
        </>
    );
};

const OrdersTable = ({ 
    orders, 
    onStatusUpdate, 
    onResendEmail, 
    updatingStatus, 
    formatCurrency, 
    inventory, 
    loading,
    refreshInterval = 60000 // Extended default refresh interval to 30 seconds
}) => {
    const [showOrderDetails, setShowOrderDetails] = useState(null);
    const [emailProcessing, setEmailProcessing] = useState({});

    const handleResendEmail = async (orderId) => {
        setEmailProcessing(prev => ({ ...prev, [orderId]: true }));
        try {
            await onResendEmail(orderId);
            toast.success('Email resent successfully');
        } catch (error) {
            toast.error('Failed to resend email');
        } finally {
            setEmailProcessing(prev => ({ ...prev, [orderId]: false }));
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600">No orders match your current filters.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Order Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order) => (
                                <tr key={order.orderId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.orderId}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {order.items?.length || 0} item(s)
                                            </div>
                                            {order.trackingNumber && (
                                                <div className="text-xs text-primary-700">
                                                    Tracking: {order.trackingNumber}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.customerName || `${order.customerFirstName || ''} ${order.customerLastName || ''}`.trim()}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {order.customerEmail}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatCurrency(order.totalAmount)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.orderDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setShowOrderDetails(order)}
                                                className="text-primary-700 hover:text-primary-500"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            
                                            <StatusDropdown 
                                                order={order}
                                                onUpdateStatus={onStatusUpdate}
                                                updatingStatus={updatingStatus}
                                            />
                                            
                                            {onResendEmail && (
                                                <button
                                                    onClick={() => handleResendEmail(order.orderId)}
                                                    disabled={emailProcessing[order.orderId]}
                                                    className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                                    title="Resend Email"
                                                >
                                                    {emailProcessing[order.orderId] ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                                                    ) : (
                                                        <Mail className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Order Details</h3>
                            <button
                                onClick={() => setShowOrderDetails(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Order ID</p>
                                    <p className="text-sm text-gray-900">{showOrderDetails.orderId}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Status</p>
                                    <StatusBadge status={showOrderDetails.status} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Customer</p>
                                    <p className="text-sm text-gray-900">
                                        {showOrderDetails.customerName || `${showOrderDetails.customerFirstName || ''} ${showOrderDetails.customerLastName || ''}`.trim()}
                                    </p>
                                    <p className="text-sm text-gray-500">{showOrderDetails.customerEmail}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                                    <p className="text-sm text-gray-900">{formatCurrency(showOrderDetails.totalAmount)}</p>
                                </div>
                            </div>
                            
                            {showOrderDetails.trackingNumber && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Tracking Number</p>
                                    <p className="text-sm text-gray-900">{showOrderDetails.trackingNumber}</p>
                                </div>
                            )}
                            
                            {showOrderDetails.items && showOrderDetails.items.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                                    <div className="space-y-2">
                                        {showOrderDetails.items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <div>
                                                    <p className="text-sm font-medium">{item.name}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OrdersTable;