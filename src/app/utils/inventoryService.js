// src/app/utils/inventoryService.js
import { googleSheetsClient } from './googleSheetsClient';
import { fetchSheetData, updateSheetData } from './googleSheetsClient';


// Configuration
const INVENTORY_SPREADSHEET_ID = process.env.NEXT_PUBLIC_INVENTORY_SPREADSHEET_ID;
const INVENTORY_RANGE = 'Inventory!A2:I1000'; // Adjust based on your actual sheet structure
const SALES_RANGE = 'Sales!A2:H1000'; // Sales sheet range

/**
 * Get inventory data
 * @returns {Promise<Array>} Inventory items
 */
export async function getInventory() {
    try {
        // const data = await googleSheetsClient.getData(INVENTORY_SPREADSHEET_ID, INVENTORY_RANGE);

        const data = await fetchSheetData(INVENTORY_SPREADSHEET_ID, INVENTORY_RANGE);


        // Transform the raw data into a structured format
        return data.map(row => ({
            id: row[0],
            name: row[1],
            category: row[2],
            sku: row[0], // Using ID as SKU
            quantity: parseInt(row[3], 10) || 0,
            price: parseFloat(row[4]) || 0,
            costPrice: parseFloat(row[5]) || 0,
            lowStockThreshold: parseInt(row[6], 10) || 5,
            imageUrl: row[7] || "",
            lastUpdated: row[8] || new Date().toISOString()
        })).filter(item => item.id); // Filter out empty rows
    } catch (error) {
        console.error('Error getting inventory items:', error);
        throw error;
    }
}

/**
 * Update inventory item
 * @param {Object} item - The item to update
 * @returns {Promise<Object>} Updated item
 */
export async function updateItem(item) {
    try {
        // Find the row with matching itemId
        const allItems = await getInventory();
        const itemIndex = allItems.findIndex(i => i.id === item.id);

        if (itemIndex === -1) {
            throw new Error(`Item with ID ${item.id} not found`);
        }

        // Calculate row number in the spreadsheet (adding 2 because of header row and 0-indexing)
        const rowNumber = itemIndex + 2;

        // Update the entire row
        const range = `Inventory!A${rowNumber}:I${rowNumber}`;
        const timestamp = new Date().toISOString();

        await googleSheetsClient.updateData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [[
                item.id,
                item.name,
                item.category,
                item.quantity.toString(),
                item.price.toString(),
                item.costPrice.toString(),
                item.lowStockThreshold.toString(),
                item.imageUrl,
                timestamp
            ]]
        );

        return {
            ...item,
            lastUpdated: timestamp
        };
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
}

/**
 * Delete inventory item
 * @param {string} itemId - The ID of the item to delete
 * @returns {Promise<boolean>} Success or failure
 */
export async function deleteItem(itemId) {
    try {
        // Find the row with matching itemId
        const allItems = await getInventory();
        const itemIndex = allItems.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        // Calculate row number in the spreadsheet (adding 2 because of header row and 0-indexing)
        const rowNumber = itemIndex + 2;

        // Clear the row (replace with empty values)
        const range = `Inventory!A${rowNumber}:I${rowNumber}`;
        await googleSheetsClient.updateData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [["", "", "", "", "", "", "", "", ""]]
        );

        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
}

/**
 * Add a new inventory item
 * @param {Object} item - The item to add
 * @returns {Promise<Object>} Added item with ID
 */
export async function addItem(item) {
    try {
        // Generate a unique ID for the new item
        const itemId = `ITEM-${Date.now()}`;
        const timestamp = new Date().toISOString();

        // Get current inventory data to find next empty row
        const currentItems = await getInventory();
        const nextRowNumber = currentItems.length + 2; // +2 for header row and 0-indexing

        const newItem = {
            ...item,
            id: itemId,
            lastUpdated: timestamp
        };

        // Append the new item to the Inventory sheet
        const range = `Inventory!A${nextRowNumber}:I${nextRowNumber}`;
        await updateSheetData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [[
                newItem.id,
                newItem.name,
                newItem.category,
                (newItem.quantity || 0).toString(),
                (newItem.price || 0).toString(),
                (newItem.costPrice || 0).toString(),
                (newItem.lowStockThreshold || 5).toString(),
                newItem.imageUrl || "",
                timestamp
            ]]
        );

        return newItem;
    } catch (error) {
        console.error('Error adding item:', error);
        throw error;
    }
}

/**
 * Record a new sale
 * @param {Object} item - Information about the item being sold
 * @param {number} quantity - Quantity being sold
 * @returns {Promise<Object>} The recorded sale
 */
export async function recordSale(item, quantity) {
    try {
        // Get the item to verify it exists and has enough stock
        const items = await getInventory();
        const currentItem = items.find(i => i.id === item.id);

        if (!currentItem) {
            throw new Error(`Item with ID ${item.id} not found`);
        }

        if (currentItem.quantity < quantity) {
            throw new Error(`Not enough stock for ${item.name}. Available: ${currentItem.quantity}`);
        }

        // Generate sale record
        const saleId = `SALE-${Date.now()}`;
        const timestamp = new Date().toISOString();
        const totalPrice = quantity * item.price;
        const userId = 'SYSTEM'; // You can change this to get from auth context

        const newSale = {
            id: saleId,
            itemId: item.id,
            itemName: item.name,
            quantity: quantity,
            unitPrice: item.price,
            totalPrice: totalPrice,
            timestamp: timestamp,
            userId: userId
        };

        // Get current sales data to find next empty row
        const currentSales = await getSales();
        const nextRowNumber = currentSales.length + 2; // +2 for header row and 0-indexing

        // Append the new sale to the Sales sheet
        const range = `Sales!A${nextRowNumber}:H${nextRowNumber}`;
        await googleSheetsClient.updateData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [[
                newSale.id,
                newSale.itemId,
                newSale.itemName,
                newSale.quantity.toString(),
                newSale.unitPrice.toString(),
                newSale.totalPrice.toString(),
                newSale.timestamp,
                newSale.userId
            ]]
        );

        // Update the inventory quantity
        const newQuantity = currentItem.quantity - quantity;
        const updatedItem = {
            ...currentItem,
            quantity: newQuantity
        };
        await updateItem(updatedItem);

        return newSale;
    } catch (error) {
        console.error('Error recording sale:', error);
        throw error;
    }
}

/**
 * Get all sales records
 * @returns {Promise<Array>} Sales records
 */
export async function getSales() {
    try {
        const data = await googleSheetsClient.getData(INVENTORY_SPREADSHEET_ID, SALES_RANGE);

        // Transform the raw data into a structured format
        return data.map(row => ({
            id: row[0],
            itemId: row[1],
            itemName: row[2],
            quantity: parseInt(row[3], 10),
            unitPrice: parseFloat(row[4]),
            totalPrice: parseFloat(row[5]),
            timestamp: row[6],
            userId: row[7]
        })).filter(sale => sale.id); // Filter out empty rows
    } catch (error) {
        console.error('Error getting sales records:', error);
        throw error;
    }
}

/**
 * Get low stock items
 * @returns {Promise<Array>} Low stock items
 */
export async function getLowStockItems() {
    try {
        const inventory = await getInventory();
        return inventory.filter(item => item.quantity <= (item.lowStockThreshold || 5));
    } catch (error) {
        console.error('Error getting low stock items:', error);
        throw error;
    }
}