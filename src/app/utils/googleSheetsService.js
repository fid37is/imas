// src/utils/googleSheetsService.js
import { getSheetsClient } from './googleAuth';
import { v4 as uuidv4 } from 'uuid';

// Google Sheet ID from environment variable
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Sheet names
const INVENTORY_SHEET = 'Inventory';
const SALES_SHEET = 'Sales';

/**
 * Get all inventory items from Google Sheets
 * @returns {Array} Array of inventory items
 */
export const getInventoryItems = async () => {
    try {
        const sheets = await getSheetsClient();

        // Get sheet data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET}!A2:J`,
        });

        const rows = response.data.values || [];

        // Map rows to inventory items with proper data types
        return rows.map(row => {
            // Make sure we have a valid row
            if (!row[0]) return null;

            return {
                id: row[0],
                name: row[1],
                category: row[2],
                sku: row[3],
                price: parseFloat(row[4] || 0),
                costPrice: parseFloat(row[5] || 0),
                quantity: parseInt(row[6] || 0),
                lowStockThreshold: parseInt(row[7] || 5),
                imageUrl: row[8] || '',
                description: row[9] || ''
            };
        }).filter(Boolean); // Remove null entries
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        throw new Error('Failed to fetch inventory items');
    }
};

/**
 * Add a new inventory item to Google Sheets
 * @param {Object} item - The item to add
 * @returns {Object} The added item with ID
 */
export const addInventoryItem = async (item) => {
    try {
        const sheets = await getSheetsClient();

        // Generate a unique ID
        const id = uuidv4();

        // Prepare row data
        const rowData = [
            id,
            item.name,
            item.category,
            item.sku,
            item.price,
            item.costPrice,
            item.quantity,
            item.lowStockThreshold,
            item.imageUrl || '',
            item.description || ''
        ];

        // Append to sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET}!A2:J2`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData]
            }
        });

        // Return the added item with ID
        return { ...item, id };
    } catch (error) {
        console.error('Error adding inventory item:', error);
        throw new Error('Failed to add inventory item');
    }
};

/**
 * Update an existing inventory item
 * @param {Object} item - The item to update (must include id)
 * @returns {Boolean} Success status
 */
export const updateInventoryItem = async (item) => {
    try {
        const sheets = await getSheetsClient();

        // First, get all items to find the row index
        const allItems = await getInventoryItems();
        const itemIndex = allItems.findIndex(i => i.id === item.id);

        if (itemIndex === -1) {
            throw new Error('Item not found');
        }

        // Row index is itemIndex + 2 (accounting for header row and 0-indexing)
        const rowIndex = itemIndex + 2;

        // Prepare row data
        const rowData = [
            item.id,
            item.name,
            item.category,
            item.sku,
            item.price,
            item.costPrice,
            item.quantity,
            item.lowStockThreshold,
            item.imageUrl || '',
            item.description || ''
        ];

        // Update the row
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET}!A${rowIndex}:J${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData]
            }
        });

        return true;
    } catch (error) {
        console.error('Error updating inventory item:', error);
        throw new Error('Failed to update inventory item');
    }
};

/**
 * Delete an inventory item by ID
 * @param {String} id - The ID of the item to delete
 * @returns {Boolean} Success status
 */
export const deleteInventoryItem = async (id) => {
    try {
        const sheets = await getSheetsClient();

        // First, get all items to find the row index
        const allItems = await getInventoryItems();
        const itemIndex = allItems.findIndex(i => i.id === id);

        if (itemIndex === -1) {
            throw new Error('Item not found');
        }

        // Row index is itemIndex + 2 (accounting for header row and 0-indexing)
        const rowIndex = itemIndex + 2;

        // Delete the row by clearing its contents
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET}!A${rowIndex}:J${rowIndex}`,
        });

        // Optionally, delete the row entirely (requires different API call)
        // This would be more complex and might require reorganizing the sheet

        return true;
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        throw new Error('Failed to delete inventory item');
    }
};

/**
 * Record a sale and update inventory
 * @param {Object} item - The item being sold
 * @param {Number} quantity - The quantity sold
 * @returns {Boolean} Success status
 */
export const recordItemSale = async (item, quantity) => {
    try {
        const sheets = await getSheetsClient();

        // Check if quantity is valid
        if (!item.id || quantity <= 0 || quantity > item.quantity) {
            throw new Error('Invalid sale: insufficient inventory or invalid quantity');
        }

        // 1. Update inventory quantity
        const updatedItem = {
            ...item,
            quantity: item.quantity - quantity
        };

        await updateInventoryItem(updatedItem);

        // 2. Record the sale in the sales sheet
        const saleData = [
            new Date().toISOString(), // timestamp
            item.id,
            item.name,
            item.sku,
            quantity,
            item.price,
            item.costPrice,
            (item.price * quantity).toFixed(2), // revenue
            ((item.price - item.costPrice) * quantity).toFixed(2) // profit
        ];

        // Append to sales sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SALES_SHEET}!A2:I2`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [saleData]
            }
        });

        return true;
    } catch (error) {
        console.error('Error recording sale:', error);
        throw new Error('Failed to record sale');
    }
};

/**
 * Initialize sheets if they don't exist
 * This would be called when setting up the app for the first time
 */
export const initializeSheets = async () => {
    try {
        const sheets = await getSheetsClient();

        // Check if sheets exist
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });

        const sheetList = response.data.sheets.map(sheet => sheet.properties.title);

        // Create inventory sheet if not exists
        if (!sheetList.includes(INVENTORY_SHEET)) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: INVENTORY_SHEET
                                }
                            }
                        }
                    ]
                }
            });

            // Add header row
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${INVENTORY_SHEET}!A1:J1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [["ID", "Name", "Category", "SKU", "Price", "Cost Price", "Quantity", "Low Stock Threshold", "Image URL", "Description"]]
                }
            });
        }

        // Create sales sheet if not exists
        if (!sheetList.includes(SALES_SHEET)) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: SALES_SHEET
                                }
                            }
                        }
                    ]
                }
            });

            // Add header row
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SALES_SHEET}!A1:I1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [["Date", "Item ID", "Item Name", "SKU", "Quantity", "Sale Price", "Cost Price", "Revenue", "Profit"]]
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Error initializing sheets:', error);
        throw new Error('Failed to initialize Google Sheets');
    }
};