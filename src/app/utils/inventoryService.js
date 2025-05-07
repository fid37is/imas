// src/app/utils/inventoryService.js
import { uploadImageToDrive, deleteFileFromDrive } from './clientDriveService';
import { addRowToSheet, getRowsFromSheet, updateRowInSheet, deleteRowFromSheet } from './clientSheetsService';

// Sheet configuration
const INVENTORY_SHEET_RANGE = 'Inventory!A:Z';
const SALES_SHEET_RANGE = 'Sales!A:Z';

// Helper function to safely parse numbers
const safeParseInt = (value, defaultValue = 0) => {
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

        // Create inventory item with image URL
        const inventoryItem = {
            ...item,
            imageUrl,
            createdAt: new Date().toISOString()
        };

        // Add item to Google Sheet
        const rowValues = [
            inventoryItem.name || '',
            inventoryItem.category || '',
            (inventoryItem.quantity || 0).toString(),
            (inventoryItem.price || 0).toString(),
            (inventoryItem.costPrice || 0).toString(),
            inventoryItem.sku || '',
            (inventoryItem.lowStockThreshold || 5).toString(),
            inventoryItem.imageUrl || '',
            inventoryItem.createdAt
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
        // Handle potential array structure issues safely
        const items = rows.slice(1).map((row, index) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];
            
            return {
                id: index.toString(),
                name: safeRow[0] || '',
                category: safeRow[1] || '',
                quantity: safeParseInt(safeRow[2], 0),
                price: safeParseFloat(safeRow[3], 0),
                costPrice: safeParseFloat(safeRow[4], 0),
                sku: safeRow[5] || '',
                lowStockThreshold: safeParseInt(safeRow[6], 5),
                imageUrl: safeRow[7] || '',
                createdAt: safeRow[8] || new Date().toISOString()
            };
        });

        return items;
    } catch (error) {
        console.error('Error getting inventory items:', error);
        throw error;
    }
};

// Update inventory item
export const updateInventoryItem = async (rowIndex, updatedItem) => {
    try {
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

        // Prepare updated row
        const rowValues = [
            updatedItem.name || '',
            updatedItem.category || '',
            (updatedItem.quantity || 0).toString(),
            (updatedItem.price || 0).toString(),
            (updatedItem.costPrice || 0).toString(),
            updatedItem.sku || '',
            (updatedItem.lowStockThreshold || 5).toString(),
            imageUrl || '',
            updatedItem.createdAt || new Date().toISOString()
        ];

        // Actual row in sheet is rowIndex + 2 (header + 0-based index)
        const updateRange = `Inventory!A${rowIndex + 2}:I${rowIndex + 2}`;
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
export const deleteInventoryItem = async (rowIndex, item) => {
    try {
        // Delete image if it exists
        if (item.imageUrl) {
            await deleteFileFromDrive(item.imageUrl).catch(err => {
                console.warn('Failed to delete image:', err);
            });
        }

        // Delete the row from the sheet
        await deleteRowFromSheet('Inventory', rowIndex + 2); // +2 for header row and 0-based index

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

        await updateInventoryItem(parseInt(inventoryItem.id), updatedItem);

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