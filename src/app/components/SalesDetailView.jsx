import React, { useState, useMemo } from 'react';
import { Eye, TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight } from 'lucide-react';

const SalesDetailView = ({ salesData }) => {
    const [selectedSale, setSelectedSale] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const formatCurrency = (value) => {
        const amount = Number(value);
        if (isNaN(amount)) return '₦0.00';
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getPriceVarianceIcon = (actual, standard) => {
        const diff = Number(actual) - Number(standard);
        if (Math.abs(diff) < 0.01) return <Minus className="h-4 w-4 text-gray-600" />;
        if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
        return <TrendingDown className="h-4 w-4 text-red-600" />;
    };

    const getPriceVarianceText = (actual, standard) => {
        const actualNum = Number(actual);
        const standardNum = Number(standard);
        
        if (isNaN(actualNum) || isNaN(standardNum) || standardNum === 0) {
            return 'No data';
        }
        
        const diff = actualNum - standardNum;
        
        if (Math.abs(diff) < 0.01) return 'No change';
        
        const percentage = ((diff / standardNum) * 100).toFixed(1);
        
        if (diff > 0) return `+${formatCurrency(diff)} (+${percentage}%)`;
        return `${formatCurrency(diff)} (${percentage}%)`;
    };

    const getActualPrice = (sale) => {
        // Priority order: actualPrice > unitPrice > sellingPrice > salePrice > price
        return Number(
            sale.actualPrice ?? 
            sale.unitPrice ?? 
            sale.sellingPrice ?? 
            sale.salePrice ?? 
            sale.price ?? 
            0
        );
    };

    const getStandardPrice = (sale) => {
        // Priority order: standardPrice > basePrice > regularPrice > originalPrice
        // If none available, fall back to unitPrice (which might be the original price)
        return Number(
            sale.standardPrice ?? 
            sale.basePrice ?? 
            sale.regularPrice ?? 
            sale.originalPrice ??
            sale.price ??
            0
        );
    };

    const calculateTotalPrice = (sale) => {
        // Use explicit totalPrice if available and valid
        if (sale.totalPrice && Number(sale.totalPrice) > 0) {
            return Number(sale.totalPrice);
        }
        
        // Fallback calculation using actual price
        const actualPrice = getActualPrice(sale);
        const quantity = Number(sale.quantity || 0);
        return actualPrice * quantity;
    };

    const calculateProfit = (sale) => {
        // Use explicit profit if available
        if (sale.profit !== undefined && sale.profit !== null && !isNaN(Number(sale.profit))) {
            return Number(sale.profit);
        }
        
        const actualPrice = getActualPrice(sale);
        const costPrice = Number(sale.costPrice || 0);
        const quantity = Number(sale.quantity || 0);
        
        if (costPrice > 0) {
            return (actualPrice - costPrice) * quantity;
        }
        
        return 0;
    };

    // Process and paginate sales data
    const processedSalesData = useMemo(() => {
        if (!salesData || !Array.isArray(salesData)) return [];
        
        return salesData
            .sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0))
            .map((sale, index) => ({
                ...sale,
                processedActualPrice: getActualPrice(sale),
                processedStandardPrice: getStandardPrice(sale),
                processedTotalPrice: calculateTotalPrice(sale),
                processedProfit: calculateProfit(sale)
            }));
    }, [salesData]);

    const totalPages = Math.ceil(processedSalesData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = processedSalesData.slice(startIndex, endIndex);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center text-sm text-gray-700">
                    <span>
                        Showing {startIndex + 1} to {Math.min(endIndex, processedSalesData.length)} of {processedSalesData.length} transactions
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="ml-4 border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>
                
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {pageNumbers.map(pageNum => (
                        <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm rounded ${
                                pageNum === currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {pageNum}
                        </button>
                    ))}
                    
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-primary-600">Sales Transactions</h3>
                <p className="text-sm text-gray-600 mt-1">
                    Total: {processedSalesData.length} transactions
                </p>
            </div>
            
            {processedSalesData.length > 0 ? (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentPageData.map((sale, index) => {
                                    const { processedActualPrice, processedStandardPrice, processedTotalPrice, processedProfit } = sale;
                                    
                                    const priceDiff = processedActualPrice - processedStandardPrice;
                                    const isDiscounted = priceDiff < -0.01;
                                    const isPremium = priceDiff > 0.01;
                                    const hasVariance = Math.abs(priceDiff) >= 0.01;
                                    
                                    return (
                                        <tr key={sale.id || `${startIndex + index}`} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {sale.timestamp || sale.date ? 
                                                    new Date(sale.timestamp || sale.date).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) : 
                                                    'N/A'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                <div className="max-w-xs truncate" title={sale.itemName || sale.name || 'Unknown Item'}>
                                                    {sale.itemName || sale.name || 'Unknown Item'}
                                                </div>
                                                {sale.sku && (
                                                    <div className="text-xs text-gray-500">SKU: {sale.sku}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {sale.quantity || 0}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {processedStandardPrice > 0 ? formatCurrency(processedStandardPrice) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={`font-medium ${
                                                        isDiscounted ? 'text-red-600' : 
                                                        isPremium ? 'text-green-600' : 'text-gray-900'
                                                    }`}>
                                                        {formatCurrency(processedActualPrice)}
                                                    </span>
                                                    {hasVariance && processedStandardPrice > 0 && (
                                                        <span className="ml-2">
                                                            {getPriceVarianceIcon(processedActualPrice, processedStandardPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {processedStandardPrice > 0 ? (
                                                    <span className={`${
                                                        isDiscounted ? 'text-red-600' : 
                                                        isPremium ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                        {hasVariance ? 
                                                            getPriceVarianceText(processedActualPrice, processedStandardPrice) : 
                                                            'No change'
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                {formatCurrency(processedTotalPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <span className={`font-medium ${
                                                    processedProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {formatCurrency(processedProfit)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedSale(sale)}
                                                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {renderPaginationControls()}
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-2">No Sales Transactions</p>
                    <p className="text-gray-600">Sales transactions will appear here once you start recording sales.</p>
                </div>
            )}
            
            {/* Sale Detail Modal */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Item Name</span>
                                    <p className="text-gray-900 font-medium">{selectedSale.itemName || selectedSale.name || 'Unknown Item'}</p>
                                </div>
                                
                                {selectedSale.sku && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">SKU</span>
                                        <p className="text-gray-900">{selectedSale.sku}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Quantity</span>
                                    <p className="text-gray-900 font-medium">{selectedSale.quantity || 0}</p>
                                </div>
                                
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Date & Time</span>
                                    <p className="text-gray-900">
                                        {selectedSale.timestamp || selectedSale.date ? 
                                            new Date(selectedSale.timestamp || selectedSale.date).toLocaleString() : 
                                            'N/A'
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            <hr className="border-gray-200" />
                            
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">Pricing Details</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Standard Price</span>
                                        <p className="text-gray-900">{formatCurrency(selectedSale.processedStandardPrice || 0)}</p>
                                    </div>
                                    
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Actual Price</span>
                                        <p className="text-gray-900 font-medium">{formatCurrency(selectedSale.processedActualPrice || 0)}</p>
                                    </div>
                                </div>
                                
                                {Math.abs((selectedSale.processedActualPrice || 0) - (selectedSale.processedStandardPrice || 0)) >= 0.01 && selectedSale.processedStandardPrice > 0 && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Price Variance</span>
                                        <div className="flex items-center space-x-2">
                                            {getPriceVarianceIcon(selectedSale.processedActualPrice, selectedSale.processedStandardPrice)}
                                            <span className={`font-medium ${
                                                selectedSale.processedActualPrice > selectedSale.processedStandardPrice ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {getPriceVarianceText(selectedSale.processedActualPrice, selectedSale.processedStandardPrice)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Cost Price</span>
                                    <p className="text-gray-900">{formatCurrency(selectedSale.costPrice || 0)}</p>
                                </div>
                            </div>
                            
                            <hr className="border-gray-200" />
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium text-gray-900">Total Amount</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(selectedSale.processedTotalPrice || 0)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium text-gray-900">Profit</span>
                                    <span className={`font-bold ${
                                        (selectedSale.processedProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {formatCurrency(selectedSale.processedProfit || 0)}
                                    </span>
                                </div>
                            </div>
                            
                            {(selectedSale.customer || selectedSale.notes) && (
                                <>
                                    <hr className="border-gray-200" />
                                    <div className="space-y-3">
                                        {selectedSale.customer && (
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">Customer</span>
                                                <p className="text-gray-900">{selectedSale.customer}</p>
                                            </div>
                                        )}
                                        
                                        {selectedSale.notes && (
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">Notes</span>
                                                <p className="text-gray-900">{selectedSale.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesDetailView;