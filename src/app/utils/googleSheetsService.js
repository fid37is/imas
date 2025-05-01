// utils/googleSheetsService.js
import { google } from 'googleapis';

// Create a OAuth2 client
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// Get the Sheets API with authenticated client
async function getSheetsApi(accessToken) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Get spreadsheet ID from environment variables or create a new one
async function getSpreadsheetId(accessToken) {
    // If spreadsheet ID is already set in environment
    if (process.env.GOOGLE_SHEETS_ID) {
        return process.env.GOOGLE_SHEETS_ID;
    }

    // Create a new spreadsheet
    try {
        const sheets = await getSheetsApi(accessToken);
        const response = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: 'Inventory Management System',
                },
                sheets: [
                    {
                        properties: {
                            title: 'Inventory',
                            gridProperties: {
                                frozenRowCount: 1,
                            },
                        },
                    },
                    {
                        properties: {
                            title: 'Sales',
                            gridProperties: {
                                frozenRowCount: 1,
                            },
                        },
                    },
                ],
            },
        });

        // Return the new spreadsheet ID
        return response.data.spreadsheetId;
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        throw new Error(`Failed to create spreadsheet: ${error.message}`);
    }
}

// Define our expected column headers for each sheet
const INVENTORY_HEADERS = [
    'ID',
    'Name',
    'Category',
    'Price',
    'Cost Price',
    'Quantity',
    'SKU',
    'Low Stock Threshold',
    'Description',
    'Image URL',
    'Image ID'
];

const SALES_HEADERS = [
    'ID',
    'Item ID',
    'Item Name',
    'Quantity',
    'Price',
    'Date'
];

/**
 * Create a header mapping object that maps column names to their indices
 * @param {Array} headers - Array of header names
 * @returns {Object} - Object mapping header names to column indices
 */
function createHeaderMapping(headers) {
    const mapping = {};
    headers.forEach((header, index) => {
        // Normalize header name (lowercase, no spaces)
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
        mapping[normalizedHeader] = index;
    });
    return mapping;
}

/**
 * Initialize a sheet with headers if needed
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetName - Name of the sheet to initialize
 * @param {Array} headers - Array of headers to set
 */
async function initializeSheet(spreadsheetId, accessToken, sheetName, headers) {
    try {
        const sheets = await getSheetsApi(accessToken);

        // Check if headers exist
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
        });

        if (!response.data.values || response.data.values.length === 0) {
            // Set headers
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [headers],
                },
            });
        }
    } catch (error) {
        console.error(`Error initializing ${sheetName} sheet:`, error);
        throw new Error(`Failed to initialize ${sheetName} sheet: ${error.message}`);
    }
}

/**
 * Initialize the inventory sheet with headers if needed
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} accessToken - Google OAuth access token
 */
async function initializeInventorySheet(spreadsheetId, accessToken) {
    return initializeSheet(spreadsheetId, accessToken, 'Inventory', INVENTORY_HEADERS);
}

/**
 * Initialize the sales sheet with headers if needed
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} accessToken - Google OAuth access token
 */
async function initializeSalesSheet(spreadsheetId, accessToken) {
    return initializeSheet(spreadsheetId, accessToken, 'Sales', SALES_HEADERS);
}

/**
 * Convert an item object to row values based on header mapping
 * @param {Object} item - The item object
 * @param {Object} headerMapping - Mapping of header names to column indices
 * @param {Array} headers - The actual headers in the sheet
 * @returns {Array} - Array of values ordered according to headers
 */
function itemToRowValues(item, headerMapping, headers) {
    // Initialize array with empty strings
    const rowValues = Array(headers.length).fill('');
    
    // Map each property from the item to the correct position in the row
    Object.entries(item).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase();
        if (headerMapping[normalizedKey] !== undefined) {
            rowValues[headerMapping[normalizedKey]] = value === undefined ? '' : value;
        }
    });
    
    return rowValues;
}

/**
 * Convert row values to an object based on header mapping
 * @param {Array} row - Array of values from a row
 * @param {Object} headerMapping - Mapping of header names to column indices
 * @param {Array} headers - The actual headers in the sheet
 * @returns {Object} - Object with properties mapped from the row
 */
function rowToItem(row, headerMapping, headers) {
    const item = {};
    
    headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
        const value = row[index] || '';
        
        // Convert numeric fields
        if (['price', 'costprice', 'quantity', 'lowstockthreshold'].includes(normalizedHeader)) {
            item[normalizedHeader] = value === '' ? 0 : Number(value);
        } else {
            item[normalizedHeader] = value;
        }
    });
    
    return item;
}

/**
 * Save an item to the inventory sheet
 * @param {Object} item - The item to save
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - The saved item
 */
export async function saveItemToSheet(item, accessToken) {
    try {
        const spreadsheetId = await getSpreadsheetId(accessToken);
        await initializeInventorySheet(spreadsheetId, accessToken);
        
        const sheets = await getSheetsApi(accessToken);

        // Get all items to find existing item
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Inventory!A:Z', // Expand range to handle potential additional columns
        });

        const values = response.data.values || [];
        const headers = values[0] || INVENTORY_HEADERS;
        const headerMapping = createHeaderMapping(headers);
        const rows = values.slice(1);
        
        // Find the ID column index
        const idColumnIndex = headerMapping['id'];
        if (idColumnIndex === undefined) {
            throw new Error('ID column not found in inventory sheet');
        }

        // Find the row index for this item if it exists
        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][idColumnIndex] === item.id) {
                rowIndex = i + 2; // +2 because row 1 is header and we're 0-indexed
                break;
            }
        }

        // Prepare values array from item object using the header mapping
        const rowValues = itemToRowValues(item, headerMapping, headers);

        if (rowIndex === -1) {
            // Add new item
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `Inventory!A:${String.fromCharCode(65 + headers.length - 1)}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [rowValues],
                },
            });
        } else {
            // Update existing item
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Inventory!A${rowIndex}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [rowValues],
                },
            });
        }

        return item;
    } catch (error) {
        console.error('Error saving item to sheet:', error);
        throw new Error(`Failed to save item: ${error.message}`);
    }
}

/**
 * Delete an item from the inventory sheet
 * @param {string} itemId - The ID of the item to delete
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} - Success flag
 */
export async function deleteItemFromSheet(itemId, accessToken) {
    try {
        const spreadsheetId = await getSpreadsheetId(accessToken);
        const sheets = await getSheetsApi(accessToken);

        // Get all items to find row to delete
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Inventory!A:Z', // Expand range to handle potential additional columns
        });

        const values = response.data.values || [];
        const headers = values[0] || [];
        const headerMapping = createHeaderMapping(headers);
        const rows = values.slice(1);
        
        // Find the ID column index
        const idColumnIndex = headerMapping['id'];
        if (idColumnIndex === undefined) {
            throw new Error('ID column not found in inventory sheet');
        }

        // Find the row index for this item
        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][idColumnIndex] === itemId) {
                rowIndex = i + 2; // +2 because row 1 is header and we're 0-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        // Clear the row (Google Sheets doesn't support true deletion, so we clear it)
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `Inventory!A${rowIndex}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex}`,
        });

        return true;
    } catch (error) {
        console.error('Error deleting item from sheet:', error);
        throw new Error(`Failed to delete item: ${error.message}`);
    }
}

/**
 * Get all inventory items from the sheet
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Array>} - Array of inventory items
 */
export async function getAllInventoryItems(accessToken) {
    try {
        const spreadsheetId = await getSpreadsheetId(accessToken);
        await initializeInventorySheet(spreadsheetId, accessToken);
        
        const sheets = await getSheetsApi(accessToken);

        // Get all items
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Inventory!A:Z', // Expand range to handle potential additional columns
        });

        const values = response.data.values || [];
        
        if (values.length <= 1) {
            return []; // Only headers or empty sheet
        }

        const headers = values[0];
        const headerMapping = createHeaderMapping(headers);
        
        const items = values.slice(1)
            .filter(row => row.length > 0 && row[headerMapping['id']]) // Filter out empty rows
            .map(row => rowToItem(row, headerMapping, headers));

        return items;
    } catch (error) {
        console.error('Error getting inventory items:', error);
        throw new Error(`Failed to get inventory items: ${error.message}`);
    }
}

/**
 * Get items with stock below their threshold
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Array>} - Array of low stock items
 */
export async function getLowStockItems(accessToken) {
    try {
        const items = await getAllInventoryItems(accessToken);
        return items.filter(item => 
            item.quantity !== undefined && 
            item.lowstockthreshold !== undefined && 
            item.quantity <= item.lowstockthreshold
        );
    } catch (error) {
        console.error('Error getting low stock items:', error);
        throw new Error(`Failed to get low stock items: ${error.message}`);
    }
}

/**
 * Add a sale record to the sales sheet
 * @param {Object} sale - The sale to record
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<string>} - The sale ID
 */
export async function addSaleToSheet(sale, accessToken) {
    try {
        const spreadsheetId = await getSpreadsheetId(accessToken);
        await initializeSalesSheet(spreadsheetId, accessToken);
        
        const sheets = await getSheetsApi(accessToken);

        // Get headers to create mapping
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sales!1:1',
        });
        
        const headers = headerResponse.data.values?.[0] || SALES_HEADERS;
        const headerMapping = createHeaderMapping(headers);

        // Generate sale ID
        const saleId = `SALE${Date.now()}`;
        
        // Create a complete sale object with ID
        const completeSale = {
            id: saleId,
            itemid: sale.itemId,
            itemname: sale.itemName,
            quantity: sale.quantity,
            price: sale.price,
            date: new Date().toISOString(),
        };
        
        // Convert to row values using header mapping
        const rowValues = itemToRowValues(completeSale, headerMapping, headers);

        // Add new sale
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `Sales!A:${String.fromCharCode(65 + headers.length - 1)}`,
            valueInputOption: 'RAW',
            resource: {
                values: [rowValues],
            },
        });

        return saleId;
    } catch (error) {
        console.error('Error adding sale to sheet:', error);
        throw new Error(`Failed to add sale: ${error.message}`);
    }
}

/**
 * Get all sales from the sheet
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Array>} - Array of sales
 */
export async function getAllSales(accessToken) {
    try {
        const spreadsheetId = await getSpreadsheetId(accessToken);
        await initializeSalesSheet(spreadsheetId, accessToken);
        
        const sheets = await getSheetsApi(accessToken);

        // Get all sales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sales!A:Z', // Expand range to handle potential additional columns
        });

        const values = response.data.values || [];
        
        if (values.length <= 1) {
            return []; // Only headers or empty sheet
        }

        const headers = values[0];
        const headerMapping = createHeaderMapping(headers);
        
        const sales = values.slice(1)
            .filter(row => row.length > 0 && row[headerMapping['id']]) // Filter out empty rows
            .map(row => {
                const sale = rowToItem(row, headerMapping, headers);
                
                // Ensure numeric conversions for quantity and price
                if (typeof sale.quantity !== 'number') {
                    sale.quantity = sale.quantity === '' ? 0 : Number(sale.quantity);
                }
                if (typeof sale.price !== 'number') {
                    sale.price = sale.price === '' ? 0 : Number(sale.price);
                }
                
                return sale;
            });

        return sales;
    } catch (error) {
        console.error('Error getting sales:', error);
        throw new Error(`Failed to get sales: ${error.message}`);
    }
}