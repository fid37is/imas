import { https } from 'firebase-functions';
import { apps, initializeApp, firestore } from 'firebase-admin';
import { google } from 'googleapis';
const sheets = google.sheets('v4');

// Initialize admin if not already initialized
if (!apps.length) {
    initializeApp();
}

// Your Google Sheets configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const INVENTORY_SHEET_NAME = 'Inventory';
const SALES_SHEET_NAME = 'Sales';

// Column mapping for inventory sheet (0-indexed)
const INVENTORY_COLUMNS = {
    ID: 0,
    NAME: 1,
    CATEGORY: 2,
    PRICE: 3,
    COST_PRICE: 4,
    QUANTITY: 5,
    SKU: 6,
    LOW_STOCK_THRESHOLD: 7,
    DESCRIPTION: 8,
    CREATED_BY: 9,
    CREATED_AT: 10,
    UPDATED_AT: 11
};

/**
 * Get authenticated Google Sheets client
 */
async function getAuthClient() {
    try {
        // Use Google Application Default Credentials
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        return await auth.getClient();
    } catch (error) {
        console.error('Error getting auth client:', error);
        throw new Error('Failed to authenticate with Google Sheets');
    }
}

/**
 * Initialize Google Sheets with headers if not already set up
 */
async function initializeSheets() {
    try {
        const authClient = await getAuthClient();
        
        // Check if spreadsheet exists
        await sheets.spreadsheets.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID
        });
        
        // Get existing sheets
        const sheetsResponse = await sheets.spreadsheets.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets.properties.title'
        });
        
        const existingSheets = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
        
        // Create batch update request
        const batchUpdateRequest = {
            requests: []
        };
        
        // Add Inventory sheet if it doesn't exist
        if (!existingSheets.includes(INVENTORY_SHEET_NAME)) {
            batchUpdateRequest.requests.push({
                addSheet: {
                    properties: {
                        title: INVENTORY_SHEET_NAME
                    }
                }
            });
            
            // Set up inventory headers
            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: SPREADSHEET_ID,
                range: `${INVENTORY_SHEET_NAME}!A1:L1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        'ID', 'Name', 'Category', 'Price', 'Cost Price', 
                        'Quantity', 'SKU', 'Low Stock Threshold', 'Description',
                        'Created By', 'Created At', 'Updated At'
                    ]]
                }
            });
        }
        
        // Add Sales sheet if it doesn't exist
        if (!existingSheets.includes(SALES_SHEET_NAME)) {
            batchUpdateRequest.requests.push({
                addSheet: {
                    properties: {
                        title: SALES_SHEET_NAME
                    }
                }
            });
            
            // Set up sales headers
            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: SPREADSHEET_ID,
                range: `${SALES_SHEET_NAME}!A1:G1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        'ID', 'Item ID', 'Item Name', 'Quantity', 'Sale Price',
                        'Total Amount', 'Sale Date'
                    ]]
                }
            });
        }
        
        // Execute batch update if needed
        if (batchUpdateRequest.requests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                auth: authClient,
                spreadsheetId: SPREADSHEET_ID,
                resource: batchUpdateRequest
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error initializing sheets:', error);
        throw new Error('Failed to initialize Google Sheets');
    }
}

/**
 * Format date object as string for Google Sheets
 */
function formatDate(date) {
    return date.toISOString();
}

export const getInventoryFromSheets = https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }
        
        // Initialize sheets if needed
        await initializeSheets();
        
        // Get auth client
        const authClient = await getAuthClient();
        
        // Get all rows from inventory sheet (skip header row)
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET_NAME}!A2:L`
        });
        
        const rows = response.data.values || [];
        
        // Convert rows to inventory items
        const items = rows.map(row => {
            // Handle potential missing values with default values
            const id = row[INVENTORY_COLUMNS.ID] || '';
            const name = row[INVENTORY_COLUMNS.NAME] || '';
            const category = row[INVENTORY_COLUMNS.CATEGORY] || '';
            const price = parseFloat(row[INVENTORY_COLUMNS.PRICE]) || 0;
            const costPrice = parseFloat(row[INVENTORY_COLUMNS.COST_PRICE]) || 0;
            const quantity = parseInt(row[INVENTORY_COLUMNS.QUANTITY]) || 0;
            const sku = row[INVENTORY_COLUMNS.SKU] || '';
            const lowStockThreshold = parseInt(row[INVENTORY_COLUMNS.LOW_STOCK_THRESHOLD]) || 5;
            const description = row[INVENTORY_COLUMNS.DESCRIPTION] || '';
            
            return {
                id,
                name,
                category,
                price,
                costPrice,
                quantity,
                sku,
                lowStockThreshold,
                description
            };
        });
        
        return items;
    } catch (error) {
        console.error('Error getting inventory from sheets:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const addInventoryItemToSheets = https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }
        
        // Initialize sheets if needed
        await initializeSheets();
        
        // Get auth client
        const authClient = await getAuthClient();
        
        // Generate a unique ID
        const id = firestore().collection('inventory').doc().id;
        const now = new Date();
        
        // Prepare row data
        const rowData = [
            id,
            data.name || '',
            data.category || '',
            data.price || 0,
            data.costPrice || 0,
            data.quantity || 0,
            data.sku || '',
            data.lowStockThreshold || 5,
            data.description || '',
            context.auth.uid,
            formatDate(now),
            formatDate(now)
        ];
        
        // Append row to inventory sheet
        await sheets.spreadsheets.values.append({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET_NAME}!A2:L2`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowData]
            }
        });
        
        // Return the item with ID
        return {
            id,
            ...data,
            createdBy: context.auth.uid,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };
    } catch (error) {
        console.error('Error adding inventory item to sheets:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const updateInventoryItemInSheets = https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }
        
        // Check if item ID exists
        if (!data.id) {
            throw new https.HttpsError(
                'invalid-argument',
                'Item ID is required'
            );
        }
        
        // Initialize sheets if needed
        await initializeSheets();
        
        // Get auth client
        const authClient = await getAuthClient();
        
        // Find the row index for this item ID
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET_NAME}!A2:A`
        });
        
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === data.id);
        
        if (rowIndex === -1) {
            throw new https.HttpsError(
                'not-found',
                'Item not found in Google Sheets'
            );
        }
        
        // Actual row number in sheet (add 2 for header row and 0-indexing)
        const actualRowNumber = rowIndex + 2;
        
        // Get current item data
        const itemResponse = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET_NAME}!A${actualRowNumber}:L${actualRowNumber}`
        });
        
        const currentItem = itemResponse.data.values[0];
        const now = new Date();
        
        // Prepare updated row data
        const updatedRowData = [
            data.id,
            data.name || currentItem[INVENTORY_COLUMNS.NAME] || '',
            data.category || currentItem[INVENTORY_COLUMNS.CATEGORY] || '',
            data.price !== undefined ? data.price : parseFloat(currentItem[INVENTORY_COLUMNS.PRICE]) || 0,
            data.costPrice !== undefined ? data.costPrice : parseFloat(currentItem[INVENTORY_COLUMNS.COST_PRICE]) || 0,
            data.quantity !== undefined ? data.quantity : parseInt(currentItem[INVENTORY_COLUMNS.QUANTITY]) || 0,
            data.sku || currentItem[INVENTORY_COLUMNS.SKU] || '',
            data.lowStockThreshold !== undefined ? data.lowStockThreshold : parseInt(currentItem[INVENTORY_COLUMNS.LOW_STOCK_THRESHOLD]) || 5,
            data.description || currentItem[INVENTORY_COLUMNS.DESCRIPTION] || '',
            currentItem[INVENTORY_COLUMNS.CREATED_BY] || context.auth.uid,
            currentItem[INVENTORY_COLUMNS.CREATED_AT] || formatDate(now),
            formatDate(now)
        ];
        
        // Update row in inventory sheet
        await sheets.spreadsheets.values.update({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET_NAME}!A${actualRowNumber}:L${actualRowNumber}`,
            valueInputOption: 'RAW',
            resource: {
                values: [updatedRowData]
            }
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating inventory item in sheets:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const deleteInventoryItemFromSheets = https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }
        
        // Check if item ID exists
        if (!data.id) {
            throw new https.HttpsError(
                'invalid-argument',
                'Item ID is required'
            );
        }
        
        // Initialize sheets if needed
        await initializeSheets();
        
        // Get auth client
        const authClient = await getAuthClient();
        
        // Find the row index for this item ID
        const response = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${INVENTORY_SHEET_NAME}!A2:A`
        });
        
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === data.id);
        
        if (rowIndex === -1) {
            throw new https.HttpsError(
                'not-found',
                'Item not found in Google Sheets'
            );
        }
        
        // Actual row number in sheet (add 2 for header row and 0-indexing)
        const actualRowNumber = rowIndex + 2;
        
        // Delete row from sheet
        await sheets.spreadsheets.batchUpdate({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: 0, // Assuming Inventory is the first sheet
                                dimension: 'ROWS',
                                startIndex: actualRowNumber - 1, // 0-indexed
                                endIndex: actualRowNumber // exclusive
                            }
                        }
                    }
                ]
            }
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting inventory item from sheets:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

export const recordSaleInSheets = https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }
        
        // Initialize sheets if needed
        await initializeSheets();
        
        // Get auth client
        const authClient = await getAuthClient();
        
        // Generate a unique ID
        const id = firestore().collection('sales').doc().id;
        const now = new Date();
        
        // Prepare row data
        const rowData = [
            id,
            data.itemId || '',
            data.itemName || '',
            data.quantity || 0,
            data.price || 0,
            (data.quantity || 0) * (data.price || 0),
            formatDate(now)
        ];
        
        // Append row to sales sheet
        await sheets.spreadsheets.values.append({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: `${SALES_SHEET_NAME}!A2:G2`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowData]
            }
        });
        
        // Update inventory quantity
        await updateInventoryItemInSheets.call(null, {
            id: data.itemId,
            quantity: data.newQuantity // This should be passed from the client
        }, context);
        
        // Return the sale with ID
        return {
            id,
            ...data,
            saleDate: now.toISOString()
        };
    } catch (error) {
        console.error('Error recording sale in sheets:', error);
        throw new https.HttpsError('internal', error.message);
    }
});