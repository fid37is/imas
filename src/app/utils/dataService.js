/**
 * Data service for interacting with inventory and sales data
 * This is a wrapper around the googleSheetsService to maintain compatibility with the existing components
 */

import {
    initGoogleAPI,
    getInventory as fetchInventoryFromSheets,
    addItem as addItemToSheets,
    updateItem as updateItemInSheets,
    deleteItem as deleteItemFromSheets,
    recordSale as recordSaleInSheets,
    getSales as fetchSalesFromSheets
} from './googleSheetsService';

// Initialize Google API on module load
let initialized = false;
const initialize = async () => {
    if (!initialized) {
        try {
            await initGoogleAPI();
            initialized = true;
        } catch (error) {
            console.error("Failed to initialize Google API:", error);
            // Don't set initialized to true if it failed
        }
    }
};

// Try to initialize when the module loads
initialize();

/**
 * Fetch all inventory items
 * @returns {Promise<Array>} Array of inventory items
 */
export const getInventory = async () => {
    try {
        // Ensure API is initialized
        if (!initialized) {
            await initialize();
        }
        return await fetchInventoryFromSheets();
    } catch (error) {
        console.error("Failed to fetch inventory:", error);
        throw error;
    }
};

/**
 * Add a new inventory item
 * @param {Object} item - The item to add
 * @returns {Promise<Object>} The added item with ID
 */
export const addItem = async (item) => {
    try {
        // Ensure API is initialized
        if (!initialized) {
            await initialize();
        }
        return await addItemToSheets(item);
    } catch (error) {
        console.error("Failed to add item:", error);
        throw error;
    }
};

/**
 * Update an existing inventory item
 * @param {Object} item - The item with updated fields
 * @returns {Promise<Object>} Response data
 */
export const updateItem = async (item) => {
    try {
        // Ensure API is initialized
        if (!initialized) {
            await initialize();
        }
        return await updateItemInSheets(item);
    } catch (error) {
        console.error("Failed to update item:", error);
        throw error;
    }
};

/**
 * Delete an inventory item
 * @param {string} id - The ID of the item to delete
 * @returns {Promise<Object>} Response data
 */
export const deleteItem = async (id) => {
    try {
        // Ensure API is initialized
        if (!initialized) {
            await initialize();
        }
        return await deleteItemFromSheets(id);
    } catch (error) {
        console.error("Failed to delete item:", error);
        throw error;
    }
};

/**
 * Upload image for an inventory item
 * @param {File} file - The image file to upload
 * @param {string} itemName - Name of the item for naming the file
 * @returns {Promise<string>} URL of the uploaded image
 */
export const uploadImage = async () => {
    try {
        // For Google Drive integration, this would need to use the Google Drive API
        // For now, we'll return a placeholder URL or handle file uploads differently
        console.warn("File upload not yet implemented with Google Drive");
        return "https://via.placeholder.com/150";
    } catch (error) {
        console.error("Failed to upload image:", error);
        throw error;
    }
};

/**
 * Record a sale transaction
 * @param {Object} item - The sold item
 * @param {number} quantity - Quantity sold
 * @returns {Promise<Object>} The recorded sale record
 */
export const recordSale = async (item, quantity) => {
    try {
        // Ensure API is initialized
        if (!initialized) {
            await initialize();
        }
        return await recordSaleInSheets(item, quantity);
    } catch (error) {
        console.error("Failed to record sale:", error);
        throw error;
    }
};

/**
 * Get all sales records
 * @returns {Promise<Array>} Array of sales records
 */
export const getSales = async () => {
    try {
        // Ensure API is initialized
        if (!initialized) {
            await initialize();
        }
        return await fetchSalesFromSheets();
    } catch (error) {
        console.error("Failed to fetch sales:", error);
        throw error;
    }
};