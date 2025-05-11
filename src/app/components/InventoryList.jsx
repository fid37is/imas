"use client";
import { useState } from "react";
import Image from "next/image";
import { Edit, ShoppingCart } from "lucide-react"; // Import icons

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
    };

    // Handle edit item - passing the full item object to the parent component
    const handleEditItem = (item) => {
        onEditItem(item);
    };

    // Format currency
    const formatCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value)) {
            return '$0.00';
        }
        return `$${value.toFixed(2)}`;
    };

    // Truncate text with ellipsis
    const truncateText = (text, maxLength = 20) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Check if item is low on stock
    const isLowStock = (item) => {
        const quantity = parseInt(item.quantity) || 0;
        const threshold = parseInt(item.lowStockThreshold) || 5;
        return quantity <= threshold;
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
                                            {item.lowStockThreshold || 5}
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

            {/* Sell Item Modal */}
            {sellModalItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h2 className="text-lg font-semibold mb-4">Sell Item: {sellModalItem.name}</h2>
                        
                        <div className="mb-4">
                            <p className="text-gray-600 mb-2">Available: {sellModalItem.quantity}</p>
                            <p className="text-gray-600 mb-2">Price: {formatCurrency(sellModalItem.price)}</p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity to sell:
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={sellModalItem.quantity}
                                value={sellQuantity}
                                onChange={(e) => setSellQuantity(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        <div className="mb-4">
                            <p className="font-medium">
                                Total: {formatCurrency((sellModalItem.price || 0) * sellQuantity)}
                            </p>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSellModalItem(null)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onSellItem(sellModalItem, sellQuantity);
                                    setSellModalItem(null);
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                                disabled={sellQuantity < 1 || sellQuantity > sellModalItem.quantity}
                            >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}