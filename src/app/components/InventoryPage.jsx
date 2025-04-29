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
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

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

    // Toggle filter panel on mobile
    const toggleFilterPanel = () => {
        setIsFilterExpanded(!isFilterExpanded);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-2xl font-bold text-primary-500 mb-4 sm:mb-0">Inventory Management</h1>

                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary-700 hover:bg-primary-500 text-[#fff] font-medium px-4 py-2 rounded transition-colors"
                    >
                        + New Item
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

            {/* Filter toggle button (mobile only) */}
            <button
                onClick={toggleFilterPanel}
                className="w-full sm:hidden bg-white rounded-lg shadow-md p-3 mb-4 flex justify-between items-center"
            >
                <span className="font-medium text-gray-700">
                    {isFilterExpanded ? 'Hide Filters' : 'Show Filters'}
                </span>
                <svg
                    className={`h-5 w-5 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {/* Filter panel */}
            <div className={`bg-white rounded-lg shadow-md p-4 mb-6 ${!isFilterExpanded ? 'hidden sm:block' : 'block'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
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
                                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 transition-colors"
                                aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
                            >
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-gray-500">
                Showing {sortedInventory.length} of {inventory.length} items
                {searchTerm && <span> matching "{searchTerm}"</span>}
                {filterCategory && <span> in {filterCategory}</span>}
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