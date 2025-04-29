import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { functions, storage } from "../firebase/config";

// Helper for debugging
const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

/**
 * Add a new item to inventory
 * @param {Object} item - Item data
 * @returns {Promise<Object>} - Item with ID
 */
export const addItem = async (item) => {
    try {
        if (isDev) console.log("Adding item:", item);
        
        // First, if there's an image, upload it to Google Drive
        if (item.imageFile) {
            const imageUrl = await uploadImageToDrive(item.imageFile);
            item.imageUrl = imageUrl;
            delete item.imageFile; // Remove the file object before sending to Cloud Function
        }

        const addItemFunction = httpsCallable(functions, 'addInventoryItem');
        if (isDev) console.log("Calling addInventoryItem function");
        const result = await addItemFunction(item);
        if (isDev) console.log("Item added successfully:", result.data);
        return result.data;
    } catch (error) {
        console.error("Error in addItem:", error);
        if (isDev) {
            console.error("Detailed error:", {
                code: error.code,
                message: error.message,
                details: error.details,
                name: error.name,
                stack: error.stack
            });
            
            if (error.code === 'unavailable' || error.message.includes('connection refused')) {
                console.error(`
                    FIREBASE EMULATOR CONNECTION ERROR: 
                    - Make sure Firebase emulator is running with 'firebase emulators:start'
                    - Check that the emulator port (5001) is correct
                    - Ensure no firewall is blocking the connection
                `);
            }
        }
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
        if (isDev) console.log("Updating item:", item);
        
        // Handle image upload if there's a new image
        if (item.imageFile) {
            const imageUrl = await uploadImageToDrive(item.imageFile);
            item.imageUrl = imageUrl;
            delete item.imageFile; // Remove the file object before sending to Cloud Function
        }
        
        const updateItemFunction = httpsCallable(functions, 'updateInventoryItem');
        await updateItemFunction(item);
        if (isDev) console.log("Item updated successfully");
    } catch (error) {
        console.error("Error in updateItem:", error);
        if (isDev) {
            console.error("Detailed error:", {
                code: error.code,
                message: error.message,
                details: error.details
            });
        }
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
        if (isDev) console.log("Deleting item:", itemId);
        
        const deleteItemFunction = httpsCallable(functions, 'deleteInventoryItem');
        await deleteItemFunction({ id: itemId });
        if (isDev) console.log("Item deleted successfully");
    } catch (error) {
        console.error("Error in deleteItem:", error);
        if (isDev) {
            console.error("Detailed error:", {
                code: error.code,
                message: error.message,
                details: error.details
            });
        }
        throw error;
    }
};

/**
 * Get all inventory items
 * @returns {Promise<Array>} - Array of inventory items
 */
export const getInventory = async () => {
    try {
        if (isDev) console.log("Fetching inventory");
        
        const getInventoryFunction = httpsCallable(functions, 'getInventory');
        const result = await getInventoryFunction();
        if (isDev) console.log("Inventory fetched successfully:", result.data?.length || 0, "items");
        return result.data || [];
    } catch (error) {
        console.error("Error in getInventory:", error);
        
        if (isDev) {
            console.error("Detailed error:", {
                code: error.code,
                message: error.message,
                details: error.details
            });
            
            if (error.code === 'unavailable' || error.message.includes('connection refused')) {
                console.error(`
                    FIREBASE EMULATOR CONNECTION ERROR: 
                    - Make sure Firebase emulator is running with 'firebase emulators:start'
                    - Check that the emulator port (5001) is correct
                    - Ensure no firewall is blocking the connection
                `);
            }
        }
        
        throw error;
    }
};

// Rest of your functions with similar improved error handling...

/**
 * Record a sale
 * @param {Object} item - Item being sold
 * @param {number} quantity - Quantity being sold
 * @returns {Promise<Object>} - Sale record with ID
 */
export const recordSale = async (item, quantity) => {
    try {
        if (isDev) console.log("Recording sale:", { item, quantity });
        
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
        
        if (isDev) console.log("Sale recorded successfully");
        return result.data;
    } catch (error) {
        console.error("Error in recordSale:", error);
        if (isDev) {
            console.error("Detailed error:", {
                code: error.code,
                message: error.message,
                details: error.details
            });
        }
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
        if (isDev) console.log("Uploading image:", file.name);
        
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
        
        if (isDev) console.log("Image uploaded successfully");
        return result.data.imageUrl || downloadUrl;
    } catch (error) {
        console.error("Error in uploadImageToDrive:", error);
        if (isDev) {
            console.error("Detailed error:", {
                code: error.code,
                message: error.message,
                details: error.details
            });
        }
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