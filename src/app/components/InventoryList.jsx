"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
    getInventory,
    updateItem,
    deleteItem,
    recordSale,
    addItem
} from "../utils/inventoryService";
import { toast } from "react-hot-toast"; // Assuming you're using react-hot-toast for notifications

export default function InventoryList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [tempItem, setTempItem] = useState({});
    const [sellQuantity, setSellQuantity] = useState(1);
    const [sellModalItem, setSellModalItem] = useState(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        name: "",
        category: "",
        sku: "",
        price: 0,
        costPrice: 0,
        quantity: 0,
        lowStockThreshold: 5,
        imageUrl: ""
    });

    // Fetch inventory data on component mount
    useEffect(() => {
        fetchInventory();
    }, []);

    // Function to fetch inventory from Google Sheets
    const fetchInventory = async () => {
        try {
            setLoading(true);
            const data = await getInventory();
            setItems(data);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load inventory");
            setLoading(false);
        }
    };

    // Handle updating an item
    const handleUpdateItem = async (updatedItem) => {
        try {
            await updateItem(updatedItem);
            toast.success("Item updated successfully");

            // Update local state
            setItems(items.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            ));

            setEditingId(null);
        } catch (error) {
            toast.error("Failed to update item");
        }
    };

    // Handle deleting an item
    const handleDeleteItem = async (itemId) => {
        if (confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteItem(itemId);
                toast.success("Item deleted successfully");

                // Update local state
                setItems(items.filter(item => item.id !== itemId));
                setSelectedItems(selectedItems.filter(id => id !== itemId));
            } catch (error) {
                toast.error("Failed to delete item");
            }
        }
    };

    // Handle selling an item
    const handleSellItem = async (item, quantity) => {
        try {
            await recordSale(item, quantity);
            toast.success("Sale recorded successfully");

            // Update local state with new quantity
            const updatedItems = items.map(i => {
                if (i.id === item.id) {
                    return { ...i, quantity: i.quantity - quantity };
                }
                return i;
            });

            setItems(updatedItems);
            setSellModalItem(null);
        } catch (error) {
            toast.error(error.message || "Failed to record sale");
        }
    };

    // Handle adding a new item
    const handleAddItem = async () => {
        try {
            // Basic validation
            if (!newItem.name || !newItem.sku) {
                toast.error("Name and SKU are required");
                return;
            }

            // Convert string inputs to appropriate types
            const itemToAdd = {
                ...newItem,
                price: parseFloat(newItem.price),
                costPrice: parseFloat(newItem.costPrice),
                quantity: parseInt(newItem.quantity),
                lowStockThreshold: parseInt(newItem.lowStockThreshold)
            };

            const result = await addItem(itemToAdd);

            // Add the new item with its ID to the local state
            setItems([...items, result]);

            // Reset form and close modal
            setNewItem({
                name: "",
                category: "",
                sku: "",
                price: 0,
                costPrice: 0,
                quantity: 0,
                lowStockThreshold: 5,
                imageUrl: ""
            });
            setAddModalOpen(false);
            toast.success("Item added successfully");
        } catch (error) {
            toast.error("Failed to add item");
        }
    };

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
        handleUpdateItem(tempItem);
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

    // Handle input change in add new item form
    const handleNewItemChange = (e) => {
        const { name, value, type } = e.target;
        setNewItem({
            ...newItem,
            [name]: type === "number" ? (value === "" ? 0 : parseFloat(value)) : value,
        });
    };

    // Open the sell modal
    const openSellModal = (item) => {
        setSellModalItem(item);
        setSellQuantity(1);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) {
            toast.error("No items selected");
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
            try {
                // Delete each selected item
                const deletePromises = selectedItems.map(id => deleteItem(id));
                await Promise.all(deletePromises);

                // Update local state
                setItems(items.filter(item => !selectedItems.includes(item.id)));
                setSelectedItems([]);
                toast.success("Items deleted successfully");
            } catch (error) {
                toast.error("Failed to delete some items");
            }
        }
    };

    // Refresh inventory from Google Sheets
    const refreshInventory = () => {
        toast.loading("Refreshing inventory...");
        fetchInventory().then(() => {
            toast.dismiss();
            toast.success("Inventory refreshed");
        });
    };

    // Calculate profit safely
    const calculateProfit = (price, costPrice, quantity) => {
        const safePrice = typeof price === 'number' ? price : 0;
        const safeCostPrice = typeof costPrice === 'number' ? costPrice : 0;
        const safeQuantity = typeof quantity === 'number' ? quantity : 0;
        
        return ((safePrice - safeCostPrice) * safeQuantity).toFixed(2);
    };

    return (
        <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap justify-between gap-2 mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        Add New Item
                    </button>
                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Delete Selected ({selectedItems.length})
                        </button>
                    )}
                </div>
                <button
                    onClick={refreshInventory}
                    className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-md hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    Refresh Data
                </button>
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                </div>
            ) : (
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
                                            className={`${item.quantity <= (item.lowStockThreshold || 0) ? "bg-red-50" : ""
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
                                                        value={tempItem.name || ""}
                                                        onChange={handleInputChange}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                    />
                                                ) : (
                                                    item.name || ""
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingId === item.id ? (
                                                    <input
                                                        type="text"
                                                        name="category"
                                                        value={tempItem.category || ""}
                                                        onChange={handleInputChange}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                    />
                                                ) : (
                                                    item.category || ""
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingId === item.id ? (
                                                    <input
                                                        type="text"
                                                        name="sku"
                                                        value={tempItem.sku || ""}
                                                        onChange={handleInputChange}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                    />
                                                ) : (
                                                    item.sku || ""
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingId === item.id ? (
                                                    <input
                                                        type="number"
                                                        name="price"
                                                        value={tempItem.price || 0}
                                                        onChange={handleInputChange}
                                                        step="0.01"
                                                        min="0"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                    />
                                                ) : (
                                                    `$${(item.price || 0).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingId === item.id ? (
                                                    <input
                                                        type="number"
                                                        name="costPrice"
                                                        value={tempItem.costPrice || 0}
                                                        onChange={handleInputChange}
                                                        step="0.01"
                                                        min="0"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                                    />
                                                ) : (
                                                    `$${(item.costPrice || 0).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingId === item.id ? (
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="number"
                                                            name="quantity"
                                                            value={tempItem.quantity || 0}
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
                                                        {item.quantity || 0}
                                                        {(item.quantity || 0) <= (item.lowStockThreshold || 0) && (
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
                                                            disabled={(item.quantity || 0) < 1}
                                                            className={`px-2 py-1 text-xs rounded transition-colors ${(item.quantity || 0) < 1
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                : "bg-accent-100 text-accent-700 hover:bg-accent-200"
                                                                }`}
                                                        >
                                                            Sell
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id)}
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
                </div>
            )}

            {/* Sell Modal */}
            {sellModalItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-primary-600">
                            Sell {sellModalItem.name || ""}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity (Available: {sellModalItem.quantity || 0})
                            </label>
                            <input
                                type="number"
                                value={sellQuantity}
                                onChange={(e) =>
                                    setSellQuantity(
                                        Math.min(parseInt(e.target.value) || 1, sellModalItem.quantity || 0)
                                    )
                                }
                                min="1"
                                max={sellModalItem.quantity || 0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600 flex justify-between">
                                <span>Sell Price:</span>
                                <span className="font-semibold">
                                ${(sellModalItem.price || 0).toFixed(2)}
                                </span>
                            </p>
                            <p className="text-sm text-gray-600 flex justify-between mt-1">
                                <span>Sale Total:</span>
                                <span className="font-semibold">
                                    ${((sellModalItem.price || 0) * sellQuantity).toFixed(2)}
                                </span>
                            </p>
                            <p className="text-sm text-accent-600 flex justify-between mt-1">
                                <span>Profit:</span>
                                <span className="font-semibold">
                                    ${calculateProfit(sellModalItem.price, sellModalItem.costPrice, sellQuantity)}
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
                                onClick={() => handleSellItem(sellModalItem, sellQuantity)}
                                className="px-4 py-2 text-sm bg-accent-500 text-primary-700 font-medium rounded-md hover:bg-accent-600 transition-colors"
                                disabled={
                                    sellQuantity < 1 || sellQuantity > (sellModalItem.quantity || 0)
                                }
                            >
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Item Modal */}
            {addModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-primary-600">Add New Item</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={newItem.name}
                                    onChange={handleNewItemChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    name="category"
                                    value={newItem.category}
                                    onChange={handleNewItemChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SKU/Barcode *</label>
                                <input
                                    type="text"
                                    name="sku"
                                    value={newItem.sku}
                                    onChange={handleNewItemChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <input
                                    type="text"
                                    name="imageUrl"
                                    value={newItem.imageUrl}
                                    onChange={handleNewItemChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price ($)</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={newItem.price}
                                    onChange={handleNewItemChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price ($)</label>
                                <input
                                    type="number"
                                    name="costPrice"
                                    value={newItem.costPrice}
                                    onChange={handleNewItemChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={newItem.quantity}
                                    onChange={handleNewItemChange}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                                <input
                                    type="number"
                                    name="lowStockThreshold"
                                    value={newItem.lowStockThreshold}
                                    onChange={handleNewItemChange}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setAddModalOpen(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddItem}
                                className="px-4 py-2 text-sm bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}