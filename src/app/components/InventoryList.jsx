"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
    getInventory,
    updateInventoryItem, // Changed from updateItem
    deleteInventoryItem, // Changed from deleteItem
    recordSale,
    addInventoryItem, // Changed from addItem
    // Note: checkAuthentication isn't exported in the provided inventoryService.js
} from "../utils/inventoryService";
import { auth } from "../firebase/config";
import { toast } from "react-hot-toast"; // Assuming you're using react-hot-toast for notifications
import { useRouter } from "next/navigation";

export default function InventoryList() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [tempItem, setTempItem] = useState({});
    const [sellQuantity, setSellQuantity] = useState(1);
    const [sellModalItem, setSellModalItem] = useState(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [authStatus, setAuthStatus] = useState(false);
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

    // Check authentication status on component mount
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setAuthStatus(!!user);

            if (user) {
                fetchInventory();
            } else {
                // Redirect to login page or show login prompt
                setLoading(false);
                toast.error("Please login to access the inventory");
                // If you have a login page, uncomment this:
                // router.push('/login');
            }
        });

        return () => unsubscribe();
    }, []);

    // Function to check authentication - since it's not exported from inventoryService
    const checkAuthentication = () => {
        const user = auth.currentUser;
        return !!user;
    };

    // Function to fetch inventory from Google Sheets
    const fetchInventory = async () => {
        try {
            setLoading(true);

            // First check if user is authenticated
            if (!checkAuthentication()) {
                toast.error("Authentication required to fetch inventory");
                setLoading(false);
                return;
            }

            const data = await getInventory();
            setItems(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching inventory:", error);
            toast.error("Failed to load inventory: " + error.message);
            setLoading(false);
        }
    };

    // Handle login (example function - replace with your actual login implementation)
    const handleLogin = async () => {
        try {
            // Add your login logic here
            // For example: await signInWithEmailAndPassword(auth, email, password);
            toast.success("Logged in successfully");
            fetchInventory();
        } catch (error) {
            toast.error("Login failed: " + error.message);
        }
    };

    // Handle updating an item
    const handleUpdateItem = async (updatedItem) => {
        try {
            if (!checkAuthentication()) {
                toast.error("Authentication required to update items");
                return;
            }

            // Use updateInventoryItem with correct parameters
            // Updated to match what the function expects
            const rowIndex = parseInt(updatedItem.id);
            await updateInventoryItem(rowIndex, updatedItem);
            
            toast.success("Item updated successfully");

            // Update local state
            setItems(items.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            ));

            setEditingId(null);
        } catch (error) {
            toast.error("Failed to update item: " + error.message);
        }
    };

    // Handle deleting an item
    const handleDeleteItem = async (itemId) => {
        if (confirm("Are you sure you want to delete this item?")) {
            try {
                if (!checkAuthentication()) {
                    toast.error("Authentication required to delete items");
                    return;
                }

                // Find the item to be deleted
                const itemToDelete = items.find(item => item.id === itemId);
                if (!itemToDelete) {
                    throw new Error("Item not found");
                }

                // Use deleteInventoryItem with correct parameters
                const rowIndex = parseInt(itemId); 
                await deleteInventoryItem(rowIndex, itemToDelete);
                
                toast.success("Item deleted successfully");

                // Update local state
                setItems(items.filter(item => item.id !== itemId));
                setSelectedItems(selectedItems.filter(id => id !== itemId));
            } catch (error) {
                toast.error("Failed to delete item: " + error.message);
            }
        }
    };

    // Handle selling an item
    const handleSellItem = async (item, quantity) => {
        try {
            if (!checkAuthentication()) {
                toast.error("Authentication required to record sales");
                return;
            }

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
            if (!checkAuthentication()) {
                toast.error("Authentication required to add items");
                return;
            }

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

            // Use addInventoryItem instead of addItem
            const result = await addInventoryItem(itemToAdd);

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
            toast.error("Failed to add item: " + error.message);
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

        if (!checkAuthentication()) {
            toast.error("Authentication required to delete items");
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
            try {
                // Delete each selected item
                const deletePromises = selectedItems.map(id => {
                    const rowIndex = parseInt(id);
                    const itemToDelete = items.find(item => item.id === id);
                    return deleteInventoryItem(rowIndex, itemToDelete);
                });
                
                await Promise.all(deletePromises);

                // Update local state
                setItems(items.filter(item => !selectedItems.includes(item.id)));
                setSelectedItems([]);
                toast.success("Items deleted successfully");
            } catch (error) {
                toast.error("Failed to delete some items: " + error.message);
            }
        }
    };

    // Refresh inventory from Google Sheets
    const refreshInventory = () => {
        if (!checkAuthentication()) {
            toast.error("Authentication required to refresh inventory");
            return;
        }

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

    // If not authenticated, show login prompt
    if (!authStatus && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-primary-600">Inventory Management</h2>
                        <p className="mt-2 text-sm text-gray-600">Please sign in to access your inventory</p>
                    </div>
                    <div className="mt-8 space-y-6">
                        <button
                            onClick={handleLogin}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                        <div className="text-center py-12 text-gray-500">
                            No inventory items found.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedItems.length === items.length}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.imageUrl ? (
                                                <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="rounded" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded text-sm text-gray-500">
                                                    N/A
                                                </div>
                                            )}
                                        </td>
                                        {editingId === item.id ? (
                                            <>
                                                <td className="px-4 py-3"><input name="name" value={tempItem.name} onChange={handleInputChange} className="border p-1 w-full" /></td>
                                                <td className="px-4 py-3"><input name="sku" value={tempItem.sku} onChange={handleInputChange} className="border p-1 w-full" /></td>
                                                <td className="px-4 py-3"><input name="category" value={tempItem.category} onChange={handleInputChange} className="border p-1 w-full" /></td>
                                                <td className="px-4 py-3"><input name="price" type="number" value={tempItem.price} onChange={handleInputChange} className="border p-1 w-full" /></td>
                                                <td className="px-4 py-3"><input name="costPrice" type="number" value={tempItem.costPrice} onChange={handleInputChange} className="border p-1 w-full" /></td>
                                                <td className="px-4 py-3"><input name="quantity" type="number" value={tempItem.quantity} onChange={handleInputChange} className="border p-1 w-full" /></td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{calculateProfit(tempItem.price, tempItem.costPrice, tempItem.quantity)}</td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button onClick={saveEdit} className="text-green-600 hover:underline">Save</button>
                                                    <button onClick={cancelEdit} className="text-gray-600 hover:underline">Cancel</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3">{item.name}</td>
                                                <td className="px-4 py-3">{item.sku}</td>
                                                <td className="px-4 py-3">{item.category}</td>
                                                <td className="px-4 py-3">${item.price}</td>
                                                <td className="px-4 py-3">${item.costPrice}</td>
                                                <td className="px-4 py-3">{item.quantity}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">${calculateProfit(item.price, item.costPrice, item.quantity)}</td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button onClick={() => startEditing(item)} className="text-blue-600 hover:underline">Edit</button>
                                                    <button onClick={() => openSellModal(item)} className="text-yellow-600 hover:underline">Sell</button>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:underline">Delete</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modals for Add Item and Sell Item */}
            {addModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-md w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Add New Item</h3>
                        <div className="space-y-2">
                            {["name", "sku", "category", "imageUrl"].map(field => (
                                <input
                                    key={field}
                                    name={field}
                                    value={newItem[field]}
                                    onChange={handleNewItemChange}
                                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                    className="w-full border p-2 rounded"
                                />
                            ))}
                            {["price", "costPrice", "quantity", "lowStockThreshold"].map(field => (
                                <input
                                    key={field}
                                    name={field}
                                    type="number"
                                    value={newItem[field]}
                                    onChange={handleNewItemChange}
                                    placeholder={field}
                                    className="w-full border p-2 rounded"
                                />
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button onClick={() => setAddModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button onClick={handleAddItem} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {sellModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-md w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-4">Sell Item: {sellModalItem.name}</h3>
                        <input
                            type="number"
                            min="1"
                            max={sellModalItem.quantity}
                            value={sellQuantity}
                            onChange={(e) => setSellQuantity(parseInt(e.target.value))}
                            className="w-full border p-2 rounded"
                        />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button onClick={() => setSellModalItem(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button
                                onClick={() => handleSellItem(sellModalItem, sellQuantity)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Confirm Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}