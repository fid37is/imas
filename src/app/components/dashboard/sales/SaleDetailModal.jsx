// Extracted Sale Detail Modal Component
import React from 'react';

export const SaleDetailModal = ({ selectedSale, setSelectedSale, formatCurrency, getPriceVarianceIcon, getPriceVarianceText }) => {
    if (!selectedSale) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
                    <button title="button"
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
    );
};