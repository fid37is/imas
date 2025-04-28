"use client";
import { useState } from "react";
import Image from "next/image";

export default function InventoryList({
    items,
    selectedItems,
    setSelectedItems,
    onUpdateItem,
    onDeleteItem,
    onSellItem,
}) {
    const [editingId, setEditingId] = useState(null);
    const [tempItem, setTempItem] = useState({});
    const [sellQuantity, setSellQuantity] = useState(1);
    const [sellModalItem, setSellModalItem] = useState(null);

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

    // Handle starting edit mode
    const startEditing = (item) => {
        setEditingId(item.id);
        setTempItem({ ...item });
    };

    // Save edited item
    const saveEdit = () => {
        onUpdateItem(tempItem);
        setEditingId(null);
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingId(null);
    };

    // Handle input change in edit mode
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setTempItem({
            ...tempItem,
            [name]: type === "number" ? parseFloat(value) : value,
        });
    };

    // Open the sell modal
    const openSellModal = (item) => {
        setSellModalItem(item);
        setSellQuantity(1);
    };

    // Handle selling an item
    const handleSell = () => {
        onSellItem(sellModalItem, parseInt(sellQuantity));
        setSellModalItem(null);
        setSellQuantity(1);
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {items.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">
                        No items in inventory. Add your first item!
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-primary-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedItems.length === items.length && items.length > 0
                                        }
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Image
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    SKU
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Price
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Cost
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr
                                    key={item.id}
                                    className={`${item.quantity <= item.lowStockThreshold ? "bg-red-50" : ""
                                        } hover:bg-gray-50`}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={(e) =>
                                                handleSelectItem(item.id, e.target.checked)
                                            }
                                            className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.imageUrl ? (
                                            <div className="relative h-12 w-12">
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    fill
                                                    sizes="48px"
                                                    className="rounded-md object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-12 w-12 bg-gray-200 rounded-md flex items-center justify-center">
                                                <span className="text-gray-500 text-xs">No image</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                name="name"
                                                value={tempItem.name}
                                                onChange={handleInputChange}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                            />
                                        ) : (
                                            item.name
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                name="category"
                                                value={tempItem.category}
                                                onChange={handleInputChange}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                            />
                                        ) : (
                                            item.category
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                name="sku"
                                                value={tempItem.sku}
                                                onChange={handleInputChange}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                            />
                                        ) : (
                                            item.sku
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <input
                                                type="number"
                                                name="price"
                                                value={tempItem.price}
                                                onChange={handleInputChange}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                            />
                                        ) : (
                                            `$${item.price.toFixed(2)}`
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <input
                                                type="number"
                                                name="costPrice"
                                                value={tempItem.costPrice}
                                                onChange={handleInputChange}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                            />
                                        ) : (
                                            `$${item.costPrice.toFixed(2)}`
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <div className="flex space-x-2">
                                                <input
                                                    type="number"
                                                    name="quantity"
                                                    value={tempItem.quantity}
                                                    onChange={handleInputChange}
                                                    min="0"
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                />
                                                <input
                                                    type="number"
                                                    name="lowStockThreshold"
                                                    value={tempItem.lowStockThreshold || 5}
                                                    onChange={handleInputChange}
                                                    min="0"
                                                    placeholder="Low stock alert"
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center">
                                                {item.quantity}
                                                {item.quantity <= item.lowStockThreshold && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Low Stock
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === item.id ? (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={saveEdit}
                                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => startEditing(item)}
                                                    className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded hover:bg-primary-200 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openSellModal(item)}
                                                    disabled={item.quantity < 1}
                                                    className={`px-2 py-1 text-xs rounded transition-colors ${item.quantity < 1
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "bg-accent-100 text-accent-700 hover:bg-accent-200"
                                                        }`}
                                                >
                                                    Sell
                                                </button>
                                                <button
                                                    onClick={() => onDeleteItem(item.id)}
                                                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
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
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-primary-600">
                            Sell {sellModalItem.name}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity (Available: {sellModalItem.quantity})
                            </label>
                            <input
                                type="number"
                                value={sellQuantity}
                                onChange={(e) =>
                                    setSellQuantity(
                                        Math.min(parseInt(e.target.value), sellModalItem.quantity)
                                    )
                                }
                                min="1"
                                max={sellModalItem.quantity}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600 flex justify-between">
                                <span>Sell Price:</span>
                                <span className="font-semibold">
                                    ${sellModalItem.price.toFixed(2)}
                                </span>
                            </p>
                            <p className="text-sm text-gray-600 flex justify-between mt-1">
                                <span>Sale Total:</span>
                                <span className="font-semibold">
                                    ${(sellModalItem.price * sellQuantity).toFixed(2)}
                                </span>
                            </p>
                            <p className="text-sm text-accent-600 flex justify-between mt-1">
                                <span>Profit:</span>
                                <span className="font-semibold">
                                    $
                                    {(
                                        (sellModalItem.price - sellModalItem.costPrice) *
                                        sellQuantity
                                    ).toFixed(2)}
                                </span>
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSellModalItem(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSell}
                                className="px-4 py-2 text-sm bg-accent-500 text-primary-700 font-medium rounded-md hover:bg-accent-600 transition-colors"
                                disabled={
                                    sellQuantity < 1 || sellQuantity > sellModalItem.quantity
                                }
                            >
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
