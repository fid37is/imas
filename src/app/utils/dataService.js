// src/utils/dataService.js

/**
 * Fetch all inventory items
 * @returns {Array} Array of inventory items
 */
export const getInventory = async () => {
    try {
        const response = await fetch('/api/items');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch inventory');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching inventory:', error);
        throw error;
    }
};

/**
 * Add a new item to inventory
 * @param {Object} item - The item to add
 * @returns {Object} The added item with ID
 */
export const addItem = async (item) => {
    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add item');
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding item:', error);
        throw error;
    }
};

/**
 * Update an existing item
 * @param {Object} item - The item to update (must include id)
 * @returns {Object} The updated item
 */
export const updateItem = async (item) => {
    try {
        if (!item.id) {
            throw new Error('Item ID is required for update');
        }

        const response = await fetch(`/api/items/${item.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update item');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
};

/**
 * Delete an item by ID
 * @param {String} id - The ID of the item to delete
 * @returns {Object} Status response
 */
export const deleteItem = async (id) => {
    try {
        const response = await fetch(`/api/items/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete item');
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
};

/**
 * Record a sale for an item
 * @param {Object} item - The item being sold
 * @param {Number} quantity - Quantity sold
 * @returns {Object} Updated item with new quantity
 */
export const recordSale = async (item, quantity) => {
    try {
        // Validate inputs
        if (!item.id || !quantity || quantity <= 0) {
            throw new Error('Invalid sale parameters');
        }

        if (quantity > item.quantity) {
            throw new Error('Not enough inventory to complete sale');
        }

        const response = await fetch('/api/items/sell', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ itemId: item.id, quantity }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record sale');
        }

        return await response.json();
    } catch (error) {
        console.error('Error recording sale:', error);
        throw error;
    }
};

/**
 * Upload an image for an item
 * @param {File} file - The image file to upload
 * @param {String} itemName - Optional item name for the file
 * @returns {String} URL of the uploaded image
 */
export const uploadItemImage = async (file, itemName = '') => {
    try {
        // Create form data for the file upload
        const formData = new FormData();
        formData.append('file', file);

        if (itemName) {
            formData.append('itemName', itemName);
        }

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload image');
        }

        const result = await response.json();
        return result.imageUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};