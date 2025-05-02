// src/app/utils/inventoryService.js
import { googleSheetsClient } from './googleSheetsClient';
import { fetchSheetData, updateSheetData, isAuthenticated } from './googleSheetsClient';

// Configuration
const INVENTORY_SPREADSHEET_ID = process.env.NEXT_PUBLIC_INVENTORY_SPREADSHEET_ID;
const INVENTORY_RANGE = 'Inventory!A2:J1000'; // Adjust based on your actual sheet structure
const SALES_RANGE = 'Sales!A2:H1000'; // Sales sheet range

/**
 * Check if the user is authenticated before proceeding with any API calls
 * @returns {boolean} Authentication status
 */
export function checkAuthentication() {
    return isAuthenticated();
}

/**
 * Get inventory data
 * @returns {Promise<Array>} Inventory items
 */
export async function getInventory() {
    try {
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to fetch inventory');
        }

        const data = await fetchSheetData(INVENTORY_SPREADSHEET_ID, INVENTORY_RANGE);

        // Transform the raw data into a structured format
        return data.map(row => ({
            id: row[0],            // Assuming 'id' is in column A
            name: row[1],          // Assuming 'name' is in column B
            category: row[2],      // Assuming 'category' is in column C
            sku: row[3],           // SKU is now correctly mapped to column D
            quantity: parseInt(row[4], 10) || 0,  // Assuming quantity is in column E
            price: parseFloat(row[5]) || 0,     // Assuming price is in column F
            costPrice: parseFloat(row[6]) || 0,  // Assuming costPrice is in column G
            lowStockThreshold: parseInt(row[7], 10) || 5, // Assuming lowStockThreshold is in column H
            imageUrl: row[8] || "", // Assuming imageUrl is in column I
            lastUpdated: row[9] || new Date().toISOString()  // Assuming lastUpdated is in column J
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
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to update inventory');
        }

        // Find the row with matching itemId
        const allItems = await getInventory();
        const itemIndex = allItems.findIndex(i => i.id === item.id);

        if (itemIndex === -1) {
            throw new Error(`Item with ID ${item.id} not found`);
        }

        // Calculate row number in the spreadsheet (adding 2 because of header row and 0-indexing)
        const rowNumber = itemIndex + 2;

        // Update the entire row
        const range = `Inventory!A${rowNumber}:J${rowNumber}`;
        const timestamp = new Date().toISOString();

        await googleSheetsClient.updateData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [[
                item.id,
                item.name,
                item.category,
                item.sku,                // Ensure sku is updated as well
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
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to delete inventory');
        }

        // Find the row with matching itemId
        const allItems = await getInventory();
        const itemIndex = allItems.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        // Calculate row number in the spreadsheet (adding 2 because of header row and 0-indexing)
        const rowNumber = itemIndex + 2;

        // Clear the row (replace with empty values)
        const range = `Inventory!A${rowNumber}:J${rowNumber}`;
        await googleSheetsClient.updateData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [["", "", "", "", "", "", "", "", "", ""]]
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
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to add inventory');
        }

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
        const range = `Inventory!A${nextRowNumber}:J${nextRowNumber}`;
        await updateSheetData(
            INVENTORY_SPREADSHEET_ID,
            range,
            [[
                newItem.id,
                newItem.name,
                newItem.category,
                newItem.sku,                 // Ensure sku is added
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
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to record sales');
        }

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
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to fetch sales');
        }

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
        // Check authentication first
        if (!checkAuthentication()) {
            throw new Error('Authentication required to get low stock items');
        }

        const inventory = await getInventory();
        return inventory.filter(item => item.quantity <= (item.lowStockThreshold || 5));
    } catch (error) {
        console.error('Error getting low stock items:', error);
        throw error;
    }
}
