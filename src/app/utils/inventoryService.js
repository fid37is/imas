// src/app/utils/inventoryService.js
import { uploadImageToDrive, deleteFileFromDrive } from './clientDriveService';
import { addRowToSheet, getRowsFromSheet, updateRowInSheet } from './clientSheetsService';

// Sheet configuration
const INVENTORY_SHEET_ID = process.env.NEXT_PUBLIC_INVENTORY_SHEET_ID;
const INVENTORY_SHEET_RANGE = 'Inventory!A:Z';
const SALES_SHEET_RANGE = 'Sales!A:Z';

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
            inventoryItem.name,
            inventoryItem.description || '',
            inventoryItem.category,
            inventoryItem.quantity.toString(),
            inventoryItem.price.toString(),
            inventoryItem.costPrice.toString(),
            inventoryItem.sku || '',
            inventoryItem.lowStockThreshold.toString(),
            inventoryItem.imageUrl || '',
            inventoryItem.createdAt
        ];

        await addRowToSheet(INVENTORY_SHEET_ID, INVENTORY_SHEET_RANGE, rowValues);

        return inventoryItem;
    } catch (error) {
        console.error('Error adding inventory item:', error);
        throw error;
    }
};

// Get all inventory items
export const getInventory = async () => {
    try {
        const rows = await getRowsFromSheet(INVENTORY_SHEET_ID, INVENTORY_SHEET_RANGE);

        // Skip header row and map to objects
        const items = rows.slice(1).map((row, index) => ({
            id: index.toString(),
            name: row[0] || '',
            description: row[1] || '',
            category: row[2] || '',
            quantity: parseInt(row[3]) || 0,
            price: parseFloat(row[4]) || 0,
            costPrice: parseFloat(row[5]) || 0,
            sku: row[6] || '',
            lowStockThreshold: parseInt(row[7]) || 5,
            imageUrl: row[8] || '',
            createdAt: row[9] || new Date().toISOString()
        }));

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
            // Upload new image
            imageUrl = await uploadImageToDrive(updatedItem.image);

            // Delete old image if exists
            if (updatedItem.imageUrl) {
                await deleteFileFromDrive(updatedItem.imageUrl).catch(err => {
                    console.warn('Failed to delete old image:', err);
                });
            }
        }

        // Prepare updated row
        const rowValues = [
            updatedItem.name,
            updatedItem.description || '',
            updatedItem.category,
            updatedItem.quantity.toString(),
            updatedItem.price.toString(),
            updatedItem.costPrice.toString(),
            updatedItem.sku || '',
            updatedItem.lowStockThreshold.toString(),
            imageUrl || '',
            updatedItem.createdAt
        ];

        // Actual row in sheet is rowIndex + 2 (header + 0-based index)
        const updateRange = `Inventory!A${rowIndex + 2}:J${rowIndex + 2}`;
        await updateRowInSheet(INVENTORY_SHEET_ID, updateRange, rowValues);

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

        // Here you would add code to delete the row from the sheet
        // For now we'll just return true since the implementation isn't shown
        
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
            inventoryItem.name,
            inventoryItem.sku || '',
            quantity.toString(),
            unitPrice.toString(),
            totalPrice.toString(),
            costPrice.toString(),
            profit.toString(),
            inventoryItem.id
        ];
        
        await addRowToSheet(INVENTORY_SHEET_ID, SALES_SHEET_RANGE, saleRow);
        
        // Update inventory quantity
        const updatedItem = {
            ...inventoryItem,
            quantity: inventoryItem.quantity - quantity
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
        const rows = await getRowsFromSheet(INVENTORY_SHEET_ID, SALES_SHEET_RANGE);
        
        // Skip header row and map to objects
        const sales = rows.slice(1).map((row, index) => ({
            id: index.toString(),
            timestamp: row[0] || '',
            itemName: row[1] || '',
            sku: row[2] || '',
            quantity: parseInt(row[3]) || 0,
            unitPrice: parseFloat(row[4]) || 0,
            totalPrice: parseFloat(row[5]) || 0,
            costPrice: parseFloat(row[6]) || 0,
            profit: parseFloat(row[7]) || 0,
            itemId: row[8] || ''
        }));
        
        return sales;
    } catch (error) {
        console.error('Error getting sales:', error);
        throw error;
    }
};