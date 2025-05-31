import React from 'react';
import { Eye } from 'lucide-react';

// Extracted Sales Table Component
export const SalesTable = ({ 
    currentPageData, 
    startIndex, 
    formatCurrency, 
    getPriceVarianceIcon, 
    getPriceVarianceText, 
    setSelectedSale 
}) => {
    return (
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
    );
};