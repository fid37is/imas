import { useState, useMemo } from 'react';

// Enhanced Inventory Table Component
export const InventoryTable = ({ inventory, formatCurrency }) => {
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'healthy'

    const filteredInventory = useMemo(() => {
        if (!Array.isArray(inventory)) return [];
        
        return inventory.filter(item => {
            const quantity = Number(item?.quantity) || 0;
            const lowStockThreshold = Number(item?.lowStockThreshold) || 0;
            const isLowStock = quantity <= lowStockThreshold;
            
            if (stockFilter === 'low') return isLowStock;
            if (stockFilter === 'healthy') return !isLowStock;
            return true; // 'all'
        });
    }, [inventory, stockFilter]);

    const getRowClassName = (item) => {
        const quantity = Number(item?.quantity) || 0;
        const lowStockThreshold = Number(item?.lowStockThreshold) || 0;
        const isLowStock = quantity <= lowStockThreshold;
        
        if (stockFilter === 'low' && isLowStock) {
            return "hover:bg-red-50 transition-colors bg-red-25";
        }
        if (stockFilter === 'healthy' && !isLowStock) {
            return "hover:bg-green-50 transition-colors bg-green-25";
        }
        return "hover:bg-gray-50 transition-colors";
    };

    const getFilterButtonClass = (filterType) => {
        const baseClass = "px-3 py-1 text-sm font-medium rounded-md transition-colors";
        if (stockFilter === filterType) {
            switch (filterType) {
                case 'low':
                    return `${baseClass} bg-red-100 text-red-800 border border-red-200`;
                case 'healthy':
                    return `${baseClass} bg-green-100 text-green-800 border border-green-200`;
                default:
                    return `${baseClass} bg-blue-100 text-blue-800 border border-blue-200`;
            }
        }
        return `${baseClass} bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200`;
    };

    return (
        <>
            {/* Filter Controls */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Filter by Stock Status</h4>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setStockFilter('all')}
                            className={getFilterButtonClass('all')}
                        >
                            All Items ({inventory?.length || 0})
                        </button>
                        <button
                            onClick={() => setStockFilter('healthy')}
                            className={getFilterButtonClass('healthy')}
                        >
                            Healthy Stock ({inventory?.filter(item => {
                                const quantity = Number(item?.quantity) || 0;
                                const threshold = Number(item?.lowStockThreshold) || 0;
                                return quantity > threshold;
                            }).length || 0})
                        </button>
                        <button
                            onClick={() => setStockFilter('low')}
                            className={getFilterButtonClass('low')}
                        >
                            Low Stock ({inventory?.filter(item => {
                                const quantity = Number(item?.quantity) || 0;
                                const threshold = Number(item?.lowStockThreshold) || 0;
                                return quantity <= threshold;
                            }).length || 0})
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {filteredInventory.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-primary-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Threshold</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Total Value</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredInventory.map((item, index) => {
                                const quantity = Number(item?.quantity) || 0;
                                const price = Number(item?.price) || 0;
                                const lowStockThreshold = Number(item?.lowStockThreshold) || 0;
                                const isLowStock = quantity <= lowStockThreshold;

                                return (
                                    <tr key={item?.id || index} className={getRowClassName(item)}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item?.name || 'Unknown Item'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {item?.category || 'Uncategorized'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            <span className={isLowStock ? 'font-semibold text-red-600' : ''}>
                                                {quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {lowStockThreshold}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {formatCurrency(price)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {formatCurrency(price * quantity)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {isLowStock ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    In Stock
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-gray-500 text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="mt-2">
                        {stockFilter === 'all' 
                            ? 'No inventory items available' 
                            : `No ${stockFilter === 'low' ? 'low stock' : 'healthy stock'} items found`
                        }
                    </p>
                </div>
            )}
        </>
    );
};
