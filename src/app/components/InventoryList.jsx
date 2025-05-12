"use client";
import { useState } from "react";
import Image from "next/image";
import { Edit, ShoppingCart, Check, X } from "lucide-react"; // Added X icon for closing image preview

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
    // New state for custom selling price
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [customPrice, setCustomPrice] = useState("");
    // New state for image preview
    const [previewImage, setPreviewImage] = useState(null);

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
        setUseCustomPrice(false); // Reset custom price toggle
        setCustomPrice(item.price); // Initialize custom price with default price
    };

    // Handle edit item - passing the full item object to the parent component
    const handleEditItem = (item) => {
        onEditItem(item);
    };

    // Open image preview
    const openImagePreview = (imageUrl, name) => {
        if (imageUrl) {
            setPreviewImage({ url: imageUrl, name });
        }
    };

    // Close image preview
    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    // Calculate the total price based on quantity and whether custom price is being used
    const calculateTotal = () => {
        if (!sellModalItem) return 0;
        
        if (useCustomPrice && customPrice !== "") {
            return Number(customPrice) * sellQuantity;
        }
        
        return sellModalItem.price * sellQuantity;
    };

    // New function to handle the sell process with loading state
    const handleCompleteSale = async () => {
        if (!sellModalItem) return;

        setIsSellingLoading(true);

        try {
            // Complete the sale with the parent component's function
            // Pass the actual selling price used (either default or custom)
            const actualSellingPrice = useCustomPrice && customPrice !== "" ? Number(customPrice) : sellModalItem.price;
            
            // We pass the custom price as an additional parameter but don't modify the original calculation logic
            await onSellItem(sellModalItem, sellQuantity, actualSellingPrice);

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

    // Handle custom price change
    const handleCustomPriceChange = (e) => {
        const value = e.target.value;
        // Allow only numbers and decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setCustomPrice(value);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No items found matching your criteria.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
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
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-14">
                                    Image
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-40">
                                    Name
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-24">
                                    SKU
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-32">
                                    Category
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-24">
                                    Price
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-24">
                                    Cost
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-20">
                                    Quantity
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-20">
                                    Low Stock
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-28">
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
                                            <div 
                                                className="cursor-pointer" 
                                                onClick={() => openImagePreview(item.imageUrl, item.name)}
                                            >
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    width={40}
                                                    height={40}
                                                    className="rounded-md object-cover hover:opacity-80 transition-opacity"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded-md text-sm text-gray-500">
                                                N/A
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900 truncate w-full overflow-hidden text-ellipsis" title={item.name}>
                                            {item.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-500 truncate w-full overflow-hidden text-ellipsis" title={item.sku}>
                                            {item.sku}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-500 truncate w-full overflow-hidden text-ellipsis" title={item.category}>
                                            {item.category}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900 truncate w-full overflow-hidden text-ellipsis" title={formatCurrency(item.price)}>
                                            {formatCurrency(item.price)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900 truncate w-full overflow-hidden text-ellipsis" title={formatCurrency(item.costPrice)}>
                                            {formatCurrency(item.costPrice)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`text-sm truncate w-full overflow-hidden text-ellipsis ${isLowStock(item) ? 'text-red-600 font-medium' : 'text-gray-900'}`} title={item.quantity}>
                                            {item.quantity}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900 truncate w-full overflow-hidden text-ellipsis" title={displayThreshold(item.lowStockThreshold)}>
                                            {displayThreshold(item.lowStockThreshold)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
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

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg p-2 max-w-3xl max-h-3xl">
                        <div className="absolute top-2 right-2 z-10">
                            <button 
                                onClick={closeImagePreview}
                                className="text-gray-700 hover:text-gray-900 bg-white rounded-full p-1 shadow-md"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-2">
                            <Image
                                src={previewImage.url}
                                alt={previewImage.name}
                                width={500}
                                height={500}
                                className="rounded-md object-contain max-h-96"
                            />
                            <p className="mt-2 text-center text-sm font-medium text-gray-700">{previewImage.name}</p>
                        </div>
                    </div>
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
                                Standard Price: {formatCurrency(sellModalItem.price)}
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
                                
                                {/* Custom Price Toggle */}
                                <div className="mb-4 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="useCustomPrice"
                                        checked={useCustomPrice}
                                        onChange={(e) => setUseCustomPrice(e.target.checked)}
                                        className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <label htmlFor="useCustomPrice" className="text-sm font-medium text-gray-700">
                                        Use custom price (for discount)
                                    </label>
                                </div>

                                {/* Custom Price Input (only shown when toggle is on) */}
                                {useCustomPrice && (
                                    <div className="mb-4">
                                        <label htmlFor="customPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                            Custom Price (per unit)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500">₦</span>
                                            </div>
                                            <input
                                                type="text"
                                                id="customPrice"
                                                value={customPrice}
                                                onChange={handleCustomPriceChange}
                                                placeholder="0.00"
                                                className="w-full p-2 pl-8 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700">
                                        Total: {formatCurrency(calculateTotal())}
                                        {useCustomPrice && customPrice !== "" && customPrice < sellModalItem.price && (
                                            <span className="text-green-600 ml-2">
                                                (Discounted)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSellModalItem(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                                {showSuccessMessage ? 'Close' : 'Cancel'}
                            </button>

                            {!showSuccessMessage && (
                                <button
                                    onClick={handleCompleteSale}
                                    disabled={isSellingLoading || (useCustomPrice && (customPrice === "" || Number(customPrice) <= 0))}
                                    className={`px-4 py-2 bg-accent-500 text-primary-700 rounded hover:bg-accent-600 flex items-center ${
                                        (isSellingLoading || (useCustomPrice && (customPrice === "" || Number(customPrice) <= 0))) 
                                        ? 'opacity-75 cursor-not-allowed' 
                                        : ''
                                    }`}
                                >
                                    {isSellingLoading ? 'Processing...' : 'Confirm Sale'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}