"use client";
import { useState } from "react";
import Image from "next/image";
import { Edit, ShoppingCart, Check } from "lucide-react"; // Added Check icon

export default function InventoryList({
    items,
    selectedItems,
    setSelectedItems,
    onUpdateItem,
    onDeleteItem,
    onSellItem,
    onEditItem
}) {
    // State for sell modal
    const [sellModalItem, setSellModalItem] = useState(null);
    const [sellQuantity, setSellQuantity] = useState(1);
    // New state for button loading and success message
    const [isSellingLoading, setIsSellingLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // Handle selecting all items
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(items.map((item) => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    // Handle selecting a single item
    const handleSelectItem = (itemId, isChecked) => {
        if (isChecked) {
            setSelectedItems([...selectedItems, itemId]);
        } else {
            setSelectedItems(selectedItems.filter((id) => id !== itemId));
        }
    };

    // Open the sell modal
    const openSellModal = (item) => {
        setSellModalItem(item);
        setSellQuantity(1);
        setShowSuccessMessage(false); // Reset success message when opening modal
    };

    // Handle edit item - passing the full item object to the parent component
    const handleEditItem = (item) => {
        onEditItem(item);
    };

    // New function to handle the sell process with loading state
    const handleCompleteSale = async () => {
        if (!sellModalItem) return;

        setIsSellingLoading(true);

        try {
            // Complete the sale with the parent component's function
            await onSellItem(sellModalItem, sellQuantity);

            // Show success message
            setShowSuccessMessage(true);

            // Keep the modal open for a moment to show the success message
            setTimeout(() => {
                setSellModalItem(null);
                setShowSuccessMessage(false);
            }, 1500);
        } catch (error) {
            console.error("Error completing sale:", error);
        } finally {
            setIsSellingLoading(false);
        }
    };

    // Format currency
    const formatCurrency = (value) => {
        const amount = Number(value);
        if (isNaN(amount)) {
            return '₦0.00';
        }
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Truncate text with ellipsis
    const truncateText = (text, maxLength = 20) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Check if item is low on stock - FIXED to properly handle empty thresholds
    const isLowStock = (item) => {
        const quantity = parseInt(item.quantity) || 0;
        
        // Only check for low stock if threshold exists and is not empty
        if (item.lowStockThreshold !== null && 
            item.lowStockThreshold !== undefined && 
            item.lowStockThreshold !== '' && 
            item.lowStockThreshold !== 0) {
            
            const threshold = parseInt(item.lowStockThreshold);
            return !isNaN(threshold) && quantity <= threshold;
        }
        return false; // If no threshold is specified or it's empty, it's not low on stock
    };

    // Helper function to display threshold value - ADDED
    const displayThreshold = (threshold) => {
        // If threshold is explicitly empty, null, or undefined, show a dash
        if (threshold === null || threshold === undefined || threshold === '') {
            return 'N/A';
        }
        // Otherwise show the actual threshold
        return threshold;
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No items found matching your criteria.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 w-10 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedItems.length === items.length && items.length > 0}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Image
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Name
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    SKU
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Category
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Price
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Cost
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Quantity
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Low Stock
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr
                                    key={item.id}
                                    className={isLowStock(item) ? "bg-red-50" : undefined}
                                >
                                    <td className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.name}
                                                width={40}
                                                height={40}
                                                className="rounded-md object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded-md text-sm text-gray-500">
                                                N/A
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                        <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                                            {truncateText(item.name, 25)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-500">{item.sku}</div>
                                    </td>
                                    <td className="px-4 py-3 max-w-[120px]">
                                        <div className="text-sm text-gray-500 truncate" title={item.category}>
                                            {truncateText(item.category, 15)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            {formatCurrency(item.price)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            {formatCurrency(item.costPrice)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`text-sm ${isLowStock(item) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                            {item.quantity}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            {displayThreshold(item.lowStockThreshold)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end space-x-3">
                                            <button
                                                onClick={() => handleEditItem(item)}
                                                className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors duration-150 flex items-center"
                                            >
                                                <Edit className="h-3 w-3 mr-1" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openSellModal(item)}
                                                className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded transition-colors duration-150 flex items-center"
                                            >
                                                <ShoppingCart className="h-3 w-3 mr-1" />
                                                Sell
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sell Modal */}
            {sellModalItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold mb-4">Sell Item</h3>
                        <div className="mb-4">
                            <p className="font-medium text-gray-700">{sellModalItem.name}</p>
                            <p className="text-sm text-gray-500">
                                Available: {sellModalItem.quantity} units
                            </p>
                            <p className="text-sm font-medium text-gray-700 mt-2">
                                Price: {formatCurrency(sellModalItem.price)}
                            </p>
                        </div>

                        {showSuccessMessage ? (
                            <div className="flex items-center justify-center py-6 text-green-600">
                                <Check className="w-6 h-6 mr-2" />
                                <span className="font-medium">Sale completed successfully!</span>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label htmlFor="sellQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity to sell
                                    </label>
                                    <input
                                        type="number"
                                        id="sellQuantity"
                                        min="1"
                                        max={sellModalItem.quantity}
                                        value={sellQuantity}
                                        onChange={(e) => setSellQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700">
                                        Total: {formatCurrency(sellModalItem.price * sellQuantity)}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSellModalItem(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                                {showSuccessMessage ? 'Close' : 'Cancel'}
                            </button>

                            {!showSuccessMessage && (
                                <button
                                    onClick={handleCompleteSale}
                                    disabled={isSellingLoading}
                                    className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center ${isSellingLoading ? 'opacity-75 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {isSellingLoading ? 'Processing...' : 'Complete Sale'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}