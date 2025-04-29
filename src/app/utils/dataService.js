import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { functions, storage } from "../firebase/config";

/**
 * Add a new item to inventory
 * @param {Object} item - Item data
 * @returns {Promise<Object>} - Item with ID
 */
export const addItem = async (item) => {
    try {
        // First, if there's an image, upload it to Google Drive
        if (item.imageFile) {
            const imageUrl = await uploadImageToDrive(item.imageFile);
            item.imageUrl = imageUrl;
            delete item.imageFile; // Remove the file object before sending to Cloud Function
        }

        const addItemFunction = httpsCallable(functions, 'addInventoryItem');
        const result = await addItemFunction(item);
        return result.data;
    } catch (error) {
        console.error("Error in addItem:", error);
        throw error;
    }
};

/**
 * Update an existing item
 * @param {Object} item - Updated item data with ID
 * @returns {Promise<void>}
 */
export const updateItem = async (item) => {
    try {
        // Handle image upload if there's a new image
        if (item.imageFile) {
            const imageUrl = await uploadImageToDrive(item.imageFile);
            item.imageUrl = imageUrl;
            delete item.imageFile; // Remove the file object before sending to Cloud Function
        }
        
        const updateItemFunction = httpsCallable(functions, 'updateInventoryItem');
        await updateItemFunction(item);
    } catch (error) {
        console.error("Error in updateItem:", error);
        throw error;
    }
};

/**
 * Delete an item by ID
 * @param {string} itemId - Item ID to delete
 * @returns {Promise<void>}
 */
export const deleteItem = async (itemId) => {
    try {
        const deleteItemFunction = httpsCallable(functions, 'deleteInventoryItem');
        await deleteItemFunction({ id: itemId });
    } catch (error) {
        console.error("Error in deleteItem:", error);
        throw error;
    }
};

/**
 * Get all inventory items
 * @returns {Promise<Array>} - Array of inventory items
 */
export const getInventory = async () => {
    try {
        const getInventoryFunction = httpsCallable(functions, 'getInventory');
        const result = await getInventoryFunction();
        return result.data || [];
    } catch (error) {
        console.error("Error in getInventory:", error);
        
        // Add error handling and more details for debugging
        if (error.code === 'unavailable' || error.message.includes('connection refused')) {
            console.error("Connection to server failed. Is the emulator running?");
            throw new Error("Server connection failed. Please ensure the backend service is running.");
        }
        
        throw error;
    }
};

/**
 * Record a sale
 * @param {Object} item - Item being sold
 * @param {number} quantity - Quantity being sold
 * @returns {Promise<Object>} - Sale record with ID
 */
export const recordSale = async (item, quantity) => {
    try {
        const saleData = {
            itemId: item.id,
            itemName: item.name,
            quantity: quantity,
            price: item.price,
            costPrice: item.costPrice || 0,
            total: item.price * quantity,
            profit: ((item.price - (item.costPrice || 0)) * quantity),
            date: new Date().toISOString()
        };

        const recordSaleFunction = httpsCallable(functions, 'recordSale');
        const result = await recordSaleFunction(saleData);

        // Also update the inventory quantity
        const updatedItem = {
            ...item,
            quantity: item.quantity - quantity
        };
        await updateItem(updatedItem);

        return result.data;
    } catch (error) {
        console.error("Error in recordSale:", error);
        throw error;
    }
};

/**
 * Get all sales records
 * @returns {Promise<Array>} - Array of sales records
 */
export const getSales = async () => {
    try {
        const getSalesFunction = httpsCallable(functions, 'getSales');
        const result = await getSalesFunction();
        return result.data || [];
    } catch (error) {
        console.error("Error in getSales:", error);
        throw error;
    }
};

/**
 * Upload image to Google Drive via Cloud Function
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} - URL to the uploaded image
 */
export const uploadImageToDrive = async (file) => {
    try {
        // First, upload to Firebase Storage as a fallback/cache
        const storageRef = ref(storage, `inventory-images/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        
        // Then convert file to base64 for sending to Cloud Function
        const base64File = await fileToBase64(file);

        // Send to Cloud Function to handle Google Drive upload
        const uploadImageFunction = httpsCallable(functions, 'uploadImageToDrive');
        const result = await uploadImageFunction({
            filename: file.name,
            contentType: file.type,
            base64Data: base64File,
            fallbackUrl: downloadUrl, // Store the Firebase URL as fallback
        });

        return result.data.imageUrl || downloadUrl;
    } catch (error) {
        console.error("Error in uploadImageToDrive:", error);
        throw error;
    }
};

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Get the base64 string by removing the prefix
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Get dashboard metrics
 * @returns {Promise<Object>} - Dashboard metrics data
 */
export const getDashboardMetrics = async () => {
    try {
        const getMetricsFunction = httpsCallable(functions, 'getDashboardMetrics');
        const result = await getMetricsFunction();
        return result.data;
    } catch (error) {
        console.error("Error in getDashboardMetrics:", error);
        throw error;
    }
};

/**
 * Export inventory to Google Sheet
 * @returns {Promise<string>} - URL to the exported spreadsheet
 */
export const exportInventory = async () => {
    try {
        const exportFunction = httpsCallable(functions, 'exportInventoryToSheet');
        const result = await exportFunction();
        return result.data.spreadsheetUrl;
    } catch (error) {
        console.error("Error in exportInventory:", error);
        throw error;
    }
};

/**
 * Import inventory from Google Sheet
 * @param {string} spreadsheetId - ID of the spreadsheet to import
 * @returns {Promise<Array>} - Array of imported items
 */
export const importInventory = async (spreadsheetId) => {
    try {
        const importFunction = httpsCallable(functions, 'importInventoryFromSheet');
        const result = await importFunction({ spreadsheetId });
        return result.data;
    } catch (error) {
        console.error("Error in importInventory:", error);
        throw error;
    }
};