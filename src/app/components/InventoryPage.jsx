"use client"
import { useState, useEffect } from 'react';
import AddItemModal from './AddItemModal';
import InventoryList from './InventoryList';
import { addInventoryItem, updateInventoryItem, deleteInventoryItem } from '../utils/inventoryService';

// Custom Alert Component
const CustomAlert = ({ message, type, isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const bgColor = type === 'success'
        ? 'bg-green-100 border-l-4 border-green-500 text-green-700'
        : type === 'error'
            ? 'bg-red-100 border-l-4 border-red-500 text-red-700'
            : 'bg-blue-100 border-l-4 border-blue-500 text-blue-700';

    return (
        <div className="fixed top-4 right-4 z-50 shadow-md transition-all duration-300 transform translate-x-0 opacity-100">
            <div className={`${bgColor} p-4 rounded-md flex items-start max-w-md`}>
                <div className="flex-grow">
                    <p className="font-medium">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="ml-4 text-gray-500 hover:text-gray-800"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};

// Confirmation Dialog Component
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// Skeleton Loader for Inventory List
const InventorySkeletonLoader = () => {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="animate-pulse">
                <div className="bg-gray-100 p-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="p-4 border-t border-gray-200">
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="py-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-5 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function InventoryPage({ inventory, setInventory, onSellItem }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, price, quantity
    const [sortDirection, setSortDirection] = useState('asc'); // asc, desc
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Alert and confirmation state
    const [alert, setAlert] = useState({ message: '', type: 'info', isOpen: false });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Show alert helper function
    const showAlert = (message, type = 'info') => {
        setAlert({ message, type, isOpen: true });
    };

    // Close alert helper function
    const closeAlert = () => {
        setAlert(prev => ({ ...prev, isOpen: false }));
    };

    // Get all categories from inventory
    const categories = [...new Set(inventory.map(item => item.category))].filter(Boolean);

    // Handle adding a new item
    const handleAddItem = async (newItem) => {
        try {
            setIsLoading(true);
            // Add to database and get ID
            const itemWithId = await addInventoryItem(newItem);

            // Update local state
            setInventory([...inventory, itemWithId]);
            setIsAddModalOpen(false);
            showAlert(`Item "${newItem.name}" added successfully`, 'success');
        } catch (error) {
            console.error("Error adding item:", error);
            showAlert("Failed to add item. Please try again.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle updating an item
    const handleUpdateItem = async (updatedItem) => {
        try {
            setIsLoading(true);
            // Update in database
            await updateInventoryItem(updatedItem);

            // Update local state
            const updatedInventory = inventory.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            );

            setInventory(updatedInventory);
            showAlert(`Item "${updatedItem.name}" updated successfully`, 'success');
        } catch (error) {
            console.error("Error updating item:", error);
            showAlert("Failed to update item. Please try again.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle deleting an item
    const handleDeleteItem = async (itemId) => {
        const itemToDelete = inventory.find(item => item.id === itemId);

        // Show confirmation dialog
        setConfirmDialog({
            isOpen: true,
            title: "Delete Item",
            message: `Are you sure you want to delete "${itemToDelete?.name || 'this item'}"?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    setIsLoading(true);
                    // Delete from database
                    await deleteInventoryItem(itemId);

                    // Update local state
                    setInventory(inventory.filter(item => item.id !== itemId));
                    showAlert(`Item deleted successfully`, 'success');
                } catch (error) {
                    console.error("Error deleting item:", error);
                    showAlert("Failed to delete item. Please try again.", 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;

        // Show confirmation dialog
        setConfirmDialog({
            isOpen: true,
            title: "Delete Items",
            message: `Are you sure you want to delete ${selectedItems.length} items?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    setIsLoading(true);
                    // Delete from database one by one
                    for (const itemId of selectedItems) {
                        await deleteInventoryItem(itemId);
                    }

                    // Update local state
                    setInventory(inventory.filter(item => !selectedItems.includes(item.id)));
                    setSelectedItems([]);
                    showAlert(`${selectedItems.length} items deleted successfully`, 'success');
                } catch (error) {
                    console.error("Error deleting items:", error);
                    showAlert("Failed to delete some items. Please try again.", 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        });
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
            {/* Custom Alert */}
            <CustomAlert
                message={alert.message}
                type={alert.type}
                isOpen={alert.isOpen}
                onClose={closeAlert}
            />

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-2xl font-bold text-primary-500 mb-4 sm:mb-0">Inventory Management</h1>

                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary-700 hover:bg-primary-500 text-[#fff] font-medium px-4 py-2 rounded transition-colors"
                        disabled={isLoading}
                    >
                        + New Item
                    </button>

                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded transition-colors"
                            disabled={isLoading}
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
                            disabled={isLoading}
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
                            disabled={isLoading}
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
                                disabled={isLoading}
                            >
                                <option value="name">Name</option>
                                <option value="price">Price</option>
                                <option value="quantity">Quantity</option>
                            </select>
                            <button
                                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 transition-colors"
                                aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
                                disabled={isLoading}
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

            {/* Show skeleton loader when loading, otherwise show inventory list */}
            {isLoading ? (
                <InventorySkeletonLoader />
            ) : (
                <InventoryList
                    items={sortedInventory}
                    selectedItems={selectedItems}
                    setSelectedItems={setSelectedItems}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onSellItem={onSellItem}
                />
            )}

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