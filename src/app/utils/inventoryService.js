// utils/inventoryService.js
import { saveItemToSheet, deleteItemFromSheet, getAllInventoryItems, getLowStockItems, addSaleToSheet } from './googleSheetsService';
import { uploadFileToDrive, deleteFileFromDrive, getInventoryFolder, extractFileIdFromUrl } from './googleDriveService';

/**
 * Add a new inventory item
 * @param {Object} item - Item to add
 * @param {File} imageFile - Image file to upload
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - Added item
 */
export async function addItem(item, imageFile, accessToken) {
    try {
        // Generate item ID if not provided
        if (!item.id) {
            item.id = `INV${Date.now()}`;
        }

        // Upload image if provided
        if (imageFile) {
            // Get inventory folder
            const folderId = await getInventoryFolder(accessToken);

            // Upload image to Drive
            const fileData = await uploadFileToDrive(imageFile, accessToken, folderId);

            // Add image data to item
            item.imageUrl = fileData.webContentLink;
            item.imageId = fileData.id;
        }

        // Save item to sheet
        await saveItemToSheet(item, accessToken);

        return item;
    } catch (error) {
        console.error('Error adding item:', error);
        throw new Error(`Failed to add item: ${error.message}`);
    }
}

/**
 * Update an existing inventory item
 * @param {Object} item - Item to update
 * @param {File} imageFile - Image file to upload (optional)
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - Updated item
 */
export async function updateItem(item, imageFile, accessToken) {
    try {
        // Check if item exists
        if (!item.id) {
            throw new Error('Item ID is required for update');
        }

        // Upload new image if provided
        if (imageFile) {
            // Get inventory folder
            const folderId = await getInventoryFolder(accessToken);

            // Delete existing image if there is one
            if (item.imageId) {
                await deleteFileFromDrive(item.imageId, accessToken).catch(err => console.warn('Could not delete old image:', err));
            }

            // Upload new image to Drive
            const fileData = await uploadFileToDrive(imageFile, accessToken, folderId);

            // Update image data
            item.imageUrl = fileData.webContentLink;
            item.imageId = fileData.id;
        } else if (item.deleteImage) {
            // Delete image without replacement
            if (item.imageId) {
                await deleteFileFromDrive(item.imageId, accessToken).catch(err => console.warn('Could not delete image:', err));
            }
            item.imageUrl = '';
            item.imageId = '';
        }

        // Save item to sheet
        await saveItemToSheet(item, accessToken);

        return item;
    } catch (error) {
        console.error('Error updating item:', error);
        throw new Error(`Failed to update item: ${error.message}`);
    }
}

/**
 * Delete an inventory item
 * @param {string} itemId - ID of the item to delete
 * @param {string} imageId - ID of the associated image to delete (optional)
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteItem(itemId, imageId, accessToken) {
    try {
        if (!itemId) {
            throw new Error('Item ID is required for deletion');
        }

        // Delete from sheet first
        await deleteItemFromSheet(itemId, accessToken);

        // Delete image if it exists
        if (imageId) {
            await deleteFileFromDrive(imageId, accessToken).catch(err => console.warn('Could not delete image:', err));
        }

        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw new Error(`Failed to delete item: ${error.message}`);
    }
}

/**
 * Get all inventory items
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Array>} - Array of inventory items
 */
export async function getItems(accessToken) {
    try {
        return await getAllInventoryItems(accessToken);
    } catch (error) {
        console.error('Error getting items:', error);
        throw new Error(`Failed to get items: ${error.message}`);
    }
}

/**
 * Get low stock items
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Array>} - Array of low stock items
 */
export async function getLowStock(accessToken) {
    try {
        return await getLowStockItems(accessToken);
    } catch (error) {
        console.error('Error getting low stock items:', error);
        throw new Error(`Failed to get low stock items: ${error.message}`);
    }
}

/**
 * Record a sale
 * @param {Object} sale - Sale details { itemId, itemName, quantity, price }
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - Sale record with ID
 */
export async function recordSale(sale, accessToken) {
    try {
        if (!sale.itemId || !sale.quantity) {
            throw new Error('Item ID and quantity are required for sale');
        }

        // Add sale to sheet
        const saleId = await addSaleToSheet(sale, accessToken);

        // Update inventory quantity
        const items = await getAllInventoryItems(accessToken);
        const item = items.find(i => i.id === sale.itemId);

        if (item) {
            const updatedItem = {
                ...item,
                quantity: Math.max(0, item.quantity - sale.quantity)
            };

            await saveItemToSheet(updatedItem, accessToken);
        }

        return { ...sale, id: saleId };
    } catch (error) {
        console.error('Error recording sale:', error);
        throw new Error(`Failed to record sale: ${error.message}`);
    }
}

/**
 * Extract file ID from image URL
 * @param {string} url - Image URL
 * @returns {string|null} - File ID or null
 */
export function getImageIdFromUrl(url) {
    return extractFileIdFromUrl(url);
}