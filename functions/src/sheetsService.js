// functions/src/sheetsService.js

import { getSheets, SHEET_ID } from './googleServiceSetup.js';
import { https } from 'firebase-functions';

// Define which sheet to use for inventory
const INVENTORY_SHEET = 'Inventory';
const SALES_SHEET = 'Sales';

/**
 * Get all inventory items from Google Sheets
 * @returns {Promise<Array>} Array of inventory items
 */
const getInventoryFromSheets = async () => {
    const sheets = getSheets();

    try {
        // Get headers first to determine columns
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A1:Z1`,
        });

        const headers = headerResponse.data.values[0];

        // Now get all data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A2:Z`,
        });

        // Handle empty sheet
        if (!response.data.values) {
            return [];
        }

        // Convert rows to objects with headers as keys
        return response.data.values.map((row, index) => {
            const item = { id: `item-${index + 1}` }; // Add ID if not present

            headers.forEach((header, i) => {
                // Skip empty cells
                if (i < row.length && row[i] !== '') {
                    // Convert numeric values
                    if (!isNaN(row[i]) && row[i] !== '') {
                        item[header] = Number(row[i]);
                    } else {
                        item[header] = row[i];
                    }
                }
            });

            return item;
        });
    } catch (error) {
        console.error('Error fetching inventory from sheets:', error);
        throw new Error(`Failed to retrieve inventory data: ${error.message}`);
    }
};

/**
 * Add an item to the Google Sheet
 * @param {Object} item - The item to add
 * @returns {Promise<Object>} - The added item with ID
 */
const addItemToSheets = async (item) => {
    const sheets = getSheets();

    try {
        // Get headers to determine column order
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A1:Z1`,
        });

        const headers = headerResponse.data.values[0];

        // Get existing rows to determine next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A2:A`,
        });

        // Generate a new ID - either based on existing rows or start with 1
        const rowCount = response.data.values ? response.data.values.length + 1 : 1;
        item.id = `item-${rowCount}`;

        // Create row values in the same order as headers
        const rowValues = headers.map(header => {
            // Handle numeric values correctly
            if (item[header] === undefined || item[header] === null) {
                return '';
            }
            return item[header].toString();
        });

        // Append the new row
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A2:Z2`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowValues]
            }
        });

        return item;
    } catch (error) {
        console.error('Error adding item to sheets:', error);
        throw new Error(`Failed to add inventory item: ${error.message}`);
    }
};

/**
 * Update an item in the Google Sheet
 * @param {Object} item - The item to update
 * @returns {Promise<void>}
 */
const updateItemInSheets = async (item) => {
    const sheets = getSheets();

    try {
        // Get headers
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A1:Z1`,
        });

        const headers = headerResponse.data.values[0];

        // Find the row with matching ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A2:Z`,
        });

        if (!response.data.values) {
            throw new Error('Item not found');
        }

        let rowIndex = -1;
        const idColumnIndex = headers.indexOf('id');

        // Find the row with matching ID
        if (idColumnIndex !== -1) {
            for (let i = 0; i < response.data.values.length; i++) {
                const row = response.data.values[i];
                if (row[idColumnIndex] === item.id) {
                    rowIndex = i + 2; // +2 because Google Sheets is 1-indexed and we have a header row
                    break;
                }
            }
        }

        if (rowIndex === -1) {
            throw new Error(`Item with ID ${item.id} not found`);
        }

        // Create updated row values
        const rowValues = headers.map(header => {
            if (item[header] === undefined || item[header] === null) {
                return '';
            }
            return item[header].toString();
        });

        // Update the row
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A${rowIndex}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowValues]
            }
        });
    } catch (error) {
        console.error('Error updating item in sheets:', error);
        throw new Error(`Failed to update inventory item: ${error.message}`);
    }
};

/**
 * Delete an item from the Google Sheet
 * @param {string} itemId - ID of the item to delete
 * @returns {Promise<void>}
 */
const deleteItemFromSheets = async (itemId) => {
    const sheets = getSheets();

    try {
        // Get headers
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A1:Z1`,
        });

        const headers = headerResponse.data.values[0];

        // Find the row with matching ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A2:Z`,
        });

        if (!response.data.values) {
            throw new Error('Item not found');
        }

        let rowIndex = -1;
        const idColumnIndex = headers.indexOf('id');

        // Find the row with matching ID
        if (idColumnIndex !== -1) {
            for (let i = 0; i < response.data.values.length; i++) {
                const row = response.data.values[i];
                if (row[idColumnIndex] === itemId) {
                    rowIndex = i + 2; // +2 because Google Sheets is 1-indexed and we have a header row
                    break;
                }
            }
        }

        if (rowIndex === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        // Clear the row (you can't delete rows via the API)
        const emptyRow = new Array(headers.length).fill('');

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${INVENTORY_SHEET}!A${rowIndex}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [emptyRow]
            }
        });
    } catch (error) {
        console.error('Error deleting item from sheets:', error);
        throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
};

/**
 * Record a sale in the Sales sheet
 * @param {Object} saleData - Sale data
 * @returns {Promise<Object>} - The recorded sale with ID
 */
const recordSaleInSheets = async (saleData) => {
    const sheets = getSheets();

    try {
        // First, check if Sales sheet exists, create it if not
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID
        });

        const salesSheetExists = spreadsheet.data.sheets.some(sheet =>
            sheet.properties.title === SALES_SHEET
        );

        if (!salesSheetExists) {
            // Create the Sales sheet with headers
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: SALES_SHEET
                            }
                        }
                    }]
                }
            });

            // Add headers
            const salesHeaders = ['id', 'itemId', 'itemName', 'quantity', 'price', 'costPrice', 'total', 'profit', 'date'];
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${SALES_SHEET}!A1:I1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [salesHeaders]
                }
            });
        }

        // Get existing sales to determine next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SALES_SHEET}!A2:A`,
        });

        // Generate a new ID
        const saleCount = response.data.values ? response.data.values.length + 1 : 1;
        saleData.id = `sale-${saleCount}`;

        // Get headers to make sure we follow the right order
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SALES_SHEET}!A1:Z1`,
        });

        const headers = headerResponse.data.values[0];

        // Create row values in the same order as headers
        const rowValues = headers.map(header => {
            if (saleData[header] === undefined || saleData[header] === null) {
                return '';
            }
            return saleData[header].toString();
        });

        // Append the new sale
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: `${SALES_SHEET}!A2:Z2`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowValues]
            }
        });

        return saleData;
    } catch (error) {
        console.error('Error recording sale in sheets:', error);
        throw new Error(`Failed to record sale: ${error.message}`);
    }
};

/**
 * Get all sales from Google Sheets
 * @returns {Promise<Array>} Array of sales records
 */
const getSalesFromSheets = async () => {
    const sheets = getSheets();

    try {
        // First, check if Sales sheet exists
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID
        });

        const salesSheetExists = spreadsheet.data.sheets.some(sheet =>
            sheet.properties.title === SALES_SHEET
        );

        if (!salesSheetExists) {
            // No sales yet
            return [];
        }

        // Get headers first to determine columns
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SALES_SHEET}!A1:Z1`,
        });

        const headers = headerResponse.data.values[0];

        // Get all sales data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SALES_SHEET}!A2:Z`,
        });

        // Handle empty sheet
        if (!response.data.values) {
            return [];
        }

        // Convert rows to objects with headers as keys
        return response.data.values.map((row) => {
            const sale = {};

            headers.forEach((header, i) => {
                // Skip empty cells
                if (i < row.length && row[i] !== '') {
                    // Convert numeric values
                    if (!isNaN(row[i]) && row[i] !== '') {
                        sale[header] = Number(row[i]);
                    } else {
                        sale[header] = row[i];
                    }
                }
            });

            return sale;
        });
    } catch (error) {
        console.error('Error fetching sales from sheets:', error);
        throw new Error(`Failed to retrieve sales data: ${error.message}`);
    }
};

// Export Cloud Functions
export const getInventory = https.onCall(async () => {
    try {
        const inventory = await getInventoryFromSheets();
        return inventory;
    } catch (error) {
        console.error('Error in getInventory function:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const addInventoryItem = https.onCall(async (data, context) => {
    try {
        // Ensure authentication
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        const addedItem = await addItemToSheets(data);
        return addedItem;
    } catch (error) {
        console.error('Error in addInventoryItem function:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const updateInventoryItem = https.onCall(async (data, context) => {
    try {
        // Ensure authentication
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        await updateItemInSheets(data);
        return { success: true };
    } catch (error) {
        console.error('Error in updateInventoryItem function:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const deleteInventoryItem = https.onCall(async (data, context) => {
    try {
        // Ensure authentication
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        await deleteItemFromSheets(data.id);
        return { success: true };
    } catch (error) {
        console.error('Error in deleteInventoryItem function:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const recordSale = https.onCall(async (data, context) => {
    try {
        // Ensure authentication
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        const sale = await recordSaleInSheets(data);
        return sale;
    } catch (error) {
        console.error('Error in recordSale function:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const getSales = https.onCall(async () => {
    try {
        const sales = await getSalesFromSheets();
        return sales;
    } catch (error) {
        console.error('Error in getSales function:', error);
        throw new https.HttpsError('internal', error.message);
    }
});