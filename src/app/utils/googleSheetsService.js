// utils/googleSheetsService.js
import {
    getSheetData,
    appendSheetData,
    updateSheetData,
    deleteSheetRow,
} from "../pages/api/lib/googleSheetsService";

// Get all inventory data from Google Sheets
export const fetchInventory = async () => {
    try {
        const rows = await getSheetData("Inventory!A2:J");

        // Map rows to objects
        const inventory = rows.map((row, index) => {
            return {
                id: row[0] || `sheet-${index}`,
                name: row[1] || "",
                sku: row[2] || "",
                category: row[3] || "",
                price: parseFloat(row[4]) || 0,
                costPrice: parseFloat(row[5]) || 0,
                quantity: parseInt(row[6]) || 0,
                lowStockThreshold: parseInt(row[7]) || 5,
                imageUrl: row[8] || "",
                lastUpdated: row[9] || new Date().toISOString()
            };
        });

        return inventory;
    } catch (error) {
        console.error("Error fetching inventory from Google Sheets:", error);
        throw error;
    }
};

// Add a new item to Google Sheets
export const addItemToSheet = async (item) => {
    try {
        // Prepare data for Google Sheets
        const newRow = [
            item.id,
            item.name,
            item.sku,
            item.category,
            item.price,
            item.costPrice,
            item.quantity,
            item.lowStockThreshold,
            item.imageUrl,
            new Date().toISOString()
        ];

        // Add to Google Sheets
        await appendSheetData("Inventory!A:J", [newRow]);

        return item;
    } catch (error) {
        console.error("Error adding item to Google Sheets:", error);
        throw error;
    }
};

// Update an item in Google Sheets
export const updateItemInSheet = async (updatedItem, rowIndex) => {
    try {
        // Update in Google Sheets
        await updateSheetData(`Inventory!A${rowIndex}:J${rowIndex}`, [[
            updatedItem.id,
            updatedItem.name,
            updatedItem.sku,
            updatedItem.category,
            updatedItem.price,
            updatedItem.costPrice,
            updatedItem.quantity,
            updatedItem.lowStockThreshold,
            updatedItem.imageUrl,
            new Date().toISOString()
        ]]);

        return updatedItem;
    } catch (error) {
        console.error("Error updating item in Google Sheets:", error);
        throw error;
    }
};

// Delete an item from Google Sheets
export const deleteItemFromSheet = async (rowIndex) => {
    try {
        // Delete row in Google Sheets (assumes sheet ID 0 for the first sheet)
        await deleteSheetRow(0, rowIndex);
        return true;
    } catch (error) {
        console.error("Error deleting item from Google Sheets:", error);
        throw error;
    }
};

// Find the row index of an item by its ID
export const findItemRowIndex = async (itemId) => {
    try {
        const ids = await getSheetData("Inventory!A:A");

        let rowIndex = -1;
        for (let i = 0; i < ids.length; i++) {
            if (ids[i][0] === itemId) {
                rowIndex = i + 1; // +1 because sheets is 1-indexed
                break;
            }
        }

        return rowIndex;
    } catch (error) {
        console.error("Error finding item row index:", error);
        throw error;
    }
};

// Record a sale in Google Sheets
export const recordSaleInSheet = async (saleData) => {
    try {
        // Add sale record to Sales sheet
        await appendSheetData("Sales!A:G", [[
            saleData.id,
            saleData.itemId,
            saleData.itemName,
            saleData.quantity,
            saleData.saleAmount,
            saleData.profit,
            saleData.date
        ]]);

        return saleData;
    } catch (error) {
        console.error("Error recording sale in Google Sheets:", error);
        throw error;
    }
};

// Get sales data from Google Sheets
export const fetchSales = async () => {
    try {
        const rows = await getSheetData("Sales!A2:G");

        // Map rows to objects
        const sales = rows.map((row) => {
            return {
                id: row[0],
                itemId: row[1],
                itemName: row[2],
                quantity: parseInt(row[3]),
                saleAmount: parseFloat(row[4]),
                profit: parseFloat(row[5]),
                date: row[6]
            };
        });

        return sales;
    } catch (error) {
        console.error("Error fetching sales from Google Sheets:", error);
        throw error;
    }
};