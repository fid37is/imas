// src/app/utils/inventoryService.js
import { uploadImageToDrive, deleteFileFromDrive } from './clientDriveService';
import { addRowToSheet, getRowsFromSheet, updateRowInSheet, deleteRowFromSheet } from './clientSheetsService';
import { generateItemId } from './idGenerator';

// Sheet configuration
const INVENTORY_SHEET_RANGE = 'Inventory!A:Z';
const SALES_SHEET_RANGE = 'Sales!A:Z';

// Helper function to safely parse numbers
const safeParseInt = (value, defaultValue = null) => {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseFloat = (value, defaultValue = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

// Add inventory item
export const addInventoryItem = async (item) => {
    try {
        // Upload image if provided
        let imageUrl = null;
        if (item.image) {
            imageUrl = await uploadImageToDrive(item.image);
        }

        // Get all existing IDs to ensure uniqueness
        const existingItems = await getInventory();
        const existingIds = existingItems.map(item => item.id);

        // Generate a store-specific ID if one doesn't exist
        const id = item.id || generateItemId(existingIds);

        // Create inventory item with image URL and ID
        const inventoryItem = {
            ...item,
            id,
            imageUrl,
            createdAt: item.createdAt || new Date().toISOString()
        };

        // Add item to Google Sheet
        const rowValues = [
            inventoryItem.id || '',             // Add ID field as first column
            inventoryItem.name || '',
            inventoryItem.category || '',
            (inventoryItem.quantity || 0).toString(),
            (inventoryItem.price || 0).toString(),
            (inventoryItem.costPrice || 0).toString(),
            inventoryItem.sku || '',
            // Store empty string if threshold is undefined/null/empty
            (inventoryItem.lowStockThreshold !== undefined &&
                inventoryItem.lowStockThreshold !== null &&
                inventoryItem.lowStockThreshold !== '')
                ? inventoryItem.lowStockThreshold.toString()
                : '',
            inventoryItem.imageUrl || '',
            inventoryItem.createdAt,
        ];

        await addRowToSheet(INVENTORY_SHEET_RANGE, rowValues);

        return inventoryItem;
    } catch (error) {
        console.error('Error adding inventory item:', error);
        throw error;
    }
};

// Get all inventory items
export const getInventory = async () => {
    try {
        const rows = await getRowsFromSheet(INVENTORY_SHEET_RANGE);

        if (!rows || rows.length === 0) {
            return [];
        }

        // Skip header row and map to objects
        // Use the actual ID from the sheet instead of the array index
        const items = rows.slice(1).map((row) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return {
                id: safeRow[0] || '',           // Use the ID from the sheet
                name: safeRow[1] || '',
                category: safeRow[2] || '',
                quantity: safeParseInt(safeRow[3], 0),
                price: safeParseFloat(safeRow[4], 0),
                costPrice: safeParseFloat(safeRow[5], 0),
                sku: safeRow[6] || '',
                // Don't set a default value for lowStockThreshold
                lowStockThreshold: safeParseInt(safeRow[7], null),
                imageUrl: safeRow[8] || '',
                createdAt: safeRow[9] || new Date().toISOString(),
            };
        });

        return items;
    } catch (error) {
        console.error('Error getting inventory items:', error);
        throw error;
    }
};

// Find item row index by ID
export const findItemRowIndexById = async (itemId) => {
    try {
        const rows = await getRowsFromSheet(INVENTORY_SHEET_RANGE);

        if (!rows || rows.length <= 1) {
            throw new Error('Item not found');
        }

        // Skip header row and find the row with matching ID
        const rowIndex = rows.findIndex((row, index) => {
            // Skip header row
            if (index === 0) return false;

            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return safeRow[0] === itemId;
        });

        if (rowIndex === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        return rowIndex;
    } catch (error) {
        console.error('Error finding item row index:', error);
        throw error;
    }
};

// Update inventory item
export const updateInventoryItem = async (itemId, updatedItem) => {
    try {
        // Find the row index of the item by ID
        const rowIndex = await findItemRowIndexById(itemId);

        // Handle image update if needed
        let imageUrl = updatedItem.imageUrl;

        // If new image is provided, upload it and delete old one
        if (updatedItem.image) {
            try {
                // Upload new image
                imageUrl = await uploadImageToDrive(updatedItem.image);

                // Delete old image if exists
                if (updatedItem.imageUrl) {
                    await deleteFileFromDrive(updatedItem.imageUrl).catch(err => {
                        console.warn('Failed to delete old image:', err);
                    });
                }
            } catch (imageError) {
                console.error('Error handling image update:', imageError);
                // Continue with update even if image handling fails
            }
        }

        // Ensure we keep the original ID
        const id = updatedItem.id || itemId;

        // Prepare updated row
        const rowValues = [
            id,                             // Keep original ID
            updatedItem.name || '',
            updatedItem.category || '',
            (updatedItem.quantity || 0).toString(),
            (updatedItem.price || 0).toString(),
            (updatedItem.costPrice || 0).toString(),
            updatedItem.sku || '',
            // Preserve empty threshold value if user intends it to be empty
            (updatedItem.lowStockThreshold !== undefined &&
                updatedItem.lowStockThreshold !== null &&
                updatedItem.lowStockThreshold !== '')
                ? updatedItem.lowStockThreshold.toString()
                : '',
            imageUrl || '',
            updatedItem.createdAt || new Date().toISOString(),
        ];

        // Update in sheet (rowIndex is 0-based, but sheet rows are 1-based)
        const updateRange = `Inventory!A${rowIndex + 1}:K${rowIndex + 1}`;
        await updateRowInSheet(updateRange, rowValues);

        return {
            ...updatedItem,
            imageUrl
        };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        throw error;
    }
};

// Delete inventory item
export const deleteInventoryItem = async (itemId) => {
    try {
        // Find the item first to get its data
        const inventory = await getInventory();
        const item = inventory.find(i => i.id === itemId);

        if (!item) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        // Find the row index of the item by ID
        const rowIndex = await findItemRowIndexById(itemId);

        // Delete image if it exists
        if (item.imageUrl) {
            await deleteFileFromDrive(item.imageUrl).catch(err => {
                console.warn('Failed to delete image:', err);
            });
        }

        // Delete the row from the sheet (rowIndex is 0-based, but sheet rows are 1-based)
        await deleteRowFromSheet('Inventory', rowIndex + 1);

        return true;
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        throw error;
    }
};

// Record a sale
export const recordSale = async (item, quantity) => {
    try {
        // Find the item in inventory
        const inventoryItems = await getInventory();
        const inventoryItem = inventoryItems.find(i => i.id === item.id);

        if (!inventoryItem) {
            throw new Error('Item not found in inventory');
        }

        if (inventoryItem.quantity < quantity) {
            throw new Error('Not enough items in stock');
        }

        // Calculate sale details
        const unitPrice = inventoryItem.price;
        const totalPrice = unitPrice * quantity;
        const costPrice = inventoryItem.costPrice || 0;
        const profit = (unitPrice - costPrice) * quantity;

        // Add sale record to sales sheet
        const saleRow = [
            new Date().toISOString(),
            inventoryItem.name || '',
            inventoryItem.sku || '',
            quantity.toString(),
            unitPrice.toString(),
            totalPrice.toString(),
            costPrice.toString(),
            profit.toString(),
            inventoryItem.id || ''
        ];

        await addRowToSheet(SALES_SHEET_RANGE, saleRow);

        // Update inventory quantity
        const updatedItem = {
            ...inventoryItem,
            quantity: Math.max(0, inventoryItem.quantity - quantity)
        };

        await updateInventoryItem(inventoryItem.id, updatedItem);

        return {
            id: new Date().getTime().toString(),
            timestamp: new Date().toISOString(),
            itemName: inventoryItem.name,
            sku: inventoryItem.sku || '',
            quantity,
            unitPrice,
            totalPrice,
            profit
        };
    } catch (error) {
        console.error('Error recording sale:', error);
        throw error;
    }
};

// Get all sales
export const getSales = async () => {
    try {
        const rows = await getRowsFromSheet(SALES_SHEET_RANGE);

        if (!rows || rows.length === 0) {
            return [];
        }

        // Skip header row and map to objects
        const sales = rows.slice(1).map((row, index) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return {
                id: index.toString(),
                timestamp: safeRow[0] || '',
                itemName: safeRow[1] || '',
                sku: safeRow[2] || '',
                quantity: safeParseInt(safeRow[3], 0),
                unitPrice: safeParseFloat(safeRow[4], 0),
                totalPrice: safeParseFloat(safeRow[5], 0),
                costPrice: safeParseFloat(safeRow[6], 0),
                profit: safeParseFloat(safeRow[7], 0),
                itemId: safeRow[8] || ''
            };
        });

        return sales;
    } catch (error) {
        console.error('Error getting sales:', error);
        throw error;
    }
};