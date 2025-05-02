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
export async function getSheetsApi(accessToken) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Get spreadsheet ID from environment variables or create a new one
export async function getSpreadsheetId(accessToken) {
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
export const INVENTORY_HEADERS = [
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

export const SALES_HEADERS = [
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
export function createHeaderMapping(headers) {
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
export async function initializeSheet(spreadsheetId, accessToken, sheetName, headers) {
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
export async function initializeInventorySheet(spreadsheetId, accessToken) {
    return initializeSheet(spreadsheetId, accessToken, 'Inventory', INVENTORY_HEADERS);
}

/**
 * Initialize the sales sheet with headers if needed
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} accessToken - Google OAuth access token
 */
export async function initializeSalesSheet(spreadsheetId, accessToken) {
    return initializeSheet(spreadsheetId, accessToken, 'Sales', SALES_HEADERS);
}

// Rest of your existing code follows...