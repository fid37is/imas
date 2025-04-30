"use client"
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AddItemModal from './AddItemModal';
import InventoryList from './InventoryList';
import {
    fetchInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
} from '../utils/dataService';

export default function InventoryPage() {
    const { data: session, status } = useSession();
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, price, quantity
    const [sortDirection, setSortDirection] = useState('asc'); // asc, desc
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [spreadsheetId, setSpreadsheetId] = useState(process.env.NEXT_PUBLIC_DEFAULT_SHEET_ID || '');

    // Get all categories from inventory
    const categories = [...new Set(inventory.map(item => item.category))].filter(Boolean);

    // Load inventory data from Google Sheets
    useEffect(() => {
        if (status === 'authenticated' && spreadsheetId) {
            loadInventory();
        }
    }, [status, spreadsheetId]);

    const loadInventory = async () => {
        try {
            setIsLoading(true);
            const data = await fetchInventory(spreadsheetId, 'Inventory!A1:J1000');

            // Convert string values to appropriate types
            const processedData = data.items.map(item => ({
                ...item,
                id: item.id || item.sku, // Use SKU as ID if no ID column exists
                price: parseFloat(item.price) || 0,
                costPrice: parseFloat(item.cost_price || item.costprice || 0) || 0,
                quantity: parseInt(item.quantity) || 0,
                lowStockThreshold: parseInt(item.low_stock_threshold || item.lowstockthreshold || 5) || 5,
                imageId: item.image_id || item.imageid || '',
                imageUrl: item.image_url || item.imageurl || '',
            }));

            setInventory(processedData);
        } catch (error) {
            console.error("Error loading inventory:", error);
            alert("Failed to load inventory data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle adding a new item
    const handleAddItem = async (newItem) => {
        try {
            // Upload image to Google Drive if provided
            if (newItem.imageFile) {
                const imageData = await uploadImageToDrive(newItem.imageFile);
                newItem.imageId = imageData.fileId;
                newItem.imageUrl = imageData.directUrl || imageData.webViewLink;
                delete newItem.imageFile; // Remove the file object
            }

            // Add to Google Sheets
            const addedItem = await addInventoryItem(spreadsheetId, newItem);

            // Update local state
            setInventory([...inventory, addedItem]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item. Please try again.");
        }
    };

    // Handle updating an item
    const handleUpdateItem = async (updatedItem) => {
        try {
            // Upload new image if provided
            if (updatedItem.imageFile) {
                const imageData = await uploadImageToDrive(updatedItem.imageFile);
                updatedItem.imageId = imageData.fileId;
                updatedItem.imageUrl = imageData.directUrl || imageData.webViewLink;
                delete updatedItem.imageFile; // Remove the file object
            }

            // Update in Google Sheets
            await updateInventoryItem(spreadsheetId, updatedItem);

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
            // Delete from Google Sheets
            await deleteInventoryItem(spreadsheetId, itemId);

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
            // Delete from Google Sheets one by one
            for (const itemId of selectedItems) {
                await deleteInventoryItem(spreadsheetId, itemId);
            }

            // Update local state
            setInventory(inventory.filter(item => !selectedItems.includes(item.id)));
            setSelectedItems([]);
        } catch (error) {
            console.error("Error deleting items:", error);
            alert("Failed to delete some items. Please try again.");
        }
    };

    // Handle selling an item
    const handleSellItem = async (item, quantity) => {
        try {
            const updatedItem = {
                ...item,
                quantity: item.quantity - quantity
            };

            // Update the item quantity in Google Sheets
            await updateInventoryItem(spreadsheetId, updatedItem);

            // Update local state
            const updatedInventory = inventory.map(invItem =>
                invItem.id === item.id ? updatedItem : invItem
            );

            setInventory(updatedInventory);

            // Optionally, record the sale in a separate "Sales" sheet
            // This would require another API call to add a row to that sheet

            return true;
        } catch (error) {
            console.error("Error selling item:", error);
            alert("Failed to process sale. Please try again.");
            return false;
        }
    };

    // Upload image to Google Drive
    const uploadImageToDrive = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        // Upload to Google Drive using the API
        const response = await fetch('/api/drive/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload image to Google Drive');
        }

        // Get the file data from the response
        const data = await response.json();

        // Get a direct URL for the image
        const urlResponse = await fetch(`/api/drive/get-url?fileId=${data.fileId}`);
        if (!urlResponse.ok) {
            throw new Error('Failed to get image URL');
        }

        return await urlResponse.json();
    };

    // Filter inventory based on search and category
    const filteredInventory = inventory.filter(item => {
        const matchesSearch =
            (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === '' || item.category === filterCategory;

        return matchesSearch && matchesCategory;
    });

    // Sort inventory
    const sortedInventory = [...filteredInventory].sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'name') {
            comparison = (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'price') {
            comparison = (a.price || 0) - (b.price || 0);
        } else if (sortBy === 'quantity') {
            comparison = (a.quantity || 0) - (b.quantity || 0);
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Toggle filter panel on mobile
    const toggleFilterPanel = () => {
        setIsFilterExpanded(!isFilterExpanded);
    };

    // Show loading state
    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading inventory...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show login prompt if not authenticated
    if (status !== 'authenticated') {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <p className="text-lg text-gray-700 mb-4">Please sign in to access inventory management</p>
                        <button
                            onClick={() => signIn('google')}
                            className="bg-primary-700 hover:bg-primary-500 text-white font-medium px-6 py-2 rounded transition-colors"
                        >
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-2xl font-bold text-primary-500 mb-4 sm:mb-0">Inventory Management</h1>

                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary-700 hover:bg-primary-500 text-white font-medium px-4 py-2 rounded transition-colors"
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

            {/* Spreadsheet ID input */}
            <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Google Sheets ID
                        </label>
                        <input
                            type="text"
                            value={spreadsheetId}
                            onChange={(e) => setSpreadsheetId(e.target.value)}
                            placeholder="Enter your Google Sheets ID..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                    </div>
                    <div className="sm:self-end">
                        <button
                            onClick={loadInventory}
                            className="w-full sm:w-auto bg-accent-500 hover:bg-accent-600 text-primary-700 font-medium px-4 py-2 rounded transition-colors"
                        >
                            Load Inventory
                        </button>
                    </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Your inventory should be in a sheet named "Inventory" with headers in row 1.
                </p>
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
                onSellItem={handleSellItem}
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