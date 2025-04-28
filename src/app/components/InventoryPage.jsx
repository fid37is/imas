"use client"
import { useState } from 'react';
import AddItemModal from './AddItemModal';
import InventoryList from './InventoryList';
import { addItem, updateItem, deleteItem } from '../utils/dataService';

export default function InventoryPage({ inventory, setInventory, onSellItem }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, price, quantity
    const [sortDirection, setSortDirection] = useState('asc'); // asc, desc

    // Get all categories from inventory
    const categories = [...new Set(inventory.map(item => item.category))].filter(Boolean);

    // Handle adding a new item
    const handleAddItem = async (newItem) => {
        try {
            // Add to database and get ID
            const itemWithId = await addItem(newItem);

            // Update local state
            setInventory([...inventory, itemWithId]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item. Please try again.");
        }
    };

    // Handle updating an item
    const handleUpdateItem = async (updatedItem) => {
        try {
            // Update in database
            await updateItem(updatedItem);

            // Update local state
            const updatedInventory = inventory.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            );

            setInventory(updatedInventory);
        } catch (error) {
            console.error("Error updating item:", error);
            alert("Failed to update item. Please try again.");
        }
    };

    // Handle deleting an item
    const handleDeleteItem = async (itemId) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            // Delete from database
            await deleteItem(itemId);

            // Update local state
            setInventory(inventory.filter(item => item.id !== itemId));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item. Please try again.");
        }
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) return;

        try {
            // Delete from database one by one
            for (const itemId of selectedItems) {
                await deleteItem(itemId);
            }

            // Update local state
            setInventory(inventory.filter(item => !selectedItems.includes(item.id)));
            setSelectedItems([]);
        } catch (error) {
            console.error("Error deleting items:", error);
            alert("Failed to delete some items. Please try again.");
        }
    };

    // Filter inventory based on search and category
    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === '' || item.category === filterCategory;

        return matchesSearch && matchesCategory;
    });

    // Sort inventory
    const sortedInventory = [...filteredInventory].sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'name') {
            comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'price') {
            comparison = a.price - b.price;
        } else if (sortBy === 'quantity') {
            comparison = a.quantity - b.quantity;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-primary-500 mb-4 md:mb-0">Inventory Management</h1>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-accent-500 hover:bg-accent-600 text-primary-700 font-medium px-4 py-2 rounded-md transition-colors"
                    >
                        Add New Item
                    </button>

                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors"
                        >
                            Delete Selected ({selectedItems.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or SKU..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Filter by Category
                        </label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sort by
                        </label>
                        <div className="flex">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            >
                                <option value="name">Name</option>
                                <option value="price">Price</option>
                                <option value="quantity">Quantity</option>
                            </select>
                            <button
                                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md"
                            >
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <InventoryList
                items={sortedInventory}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onSellItem={onSellItem}
            />

            {isAddModalOpen && (
                <AddItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleAddItem}
                />
            )}
        </div>
    );
}