// utils/googleSheetsClient.js
/**
 * Client-side utility functions for interacting with the Google Sheets API endpoint
 */

import { auth } from '../firebase/config';

/**
 * Gets the current auth token
 * @returns {Promise<string>} The authentication token
 */
async function getAuthToken() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('Not authenticated');
    }
    
    try {
        return await currentUser.getIdToken();
    } catch (error) {
        console.error('Error getting auth token:', error);
        throw new Error('Authentication failed: ' + error.message);
    }
}

/**
 * Checks if user is authenticated
 * @returns {boolean} - Authentication status
 */
export function isAuthenticated() {
    return !!auth.currentUser;
}

/**
 * Fetches data from Google Sheets
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The range to fetch (e.g., 'Inventory!A2:I1000')
 * @returns {Promise<Array>} - The API response data
 */
export async function fetchSheetData(spreadsheetId, range) {
    try {
        if (!isAuthenticated()) {
            throw new Error('User is not authenticated');
        }
        
        const token = await getAuthToken();

        const response = await fetch(`/api/googleSheets?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch data: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        throw error;
    }
}

/**
 * Updates or appends data to Google Sheets
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The range to update (e.g., 'Inventory!A2:I2')
 * @param {Array} values - The values to update
 * @param {string} [insertDataOption] - Optional. If provided, will append instead of update ('INSERT_ROWS', 'OVERWRITE')
 * @returns {Promise<Object>} - The API response data
 */
export async function updateSheetData(spreadsheetId, range, values, insertDataOption = null) {
    try {
        if (!isAuthenticated()) {
            throw new Error('User is not authenticated');
        }
        
        const token = await getAuthToken();

        const requestBody = {
            valueInputOption: 'RAW',
            values
        };

        if (insertDataOption) {
            requestBody.insertDataOption = insertDataOption;
        }

        const response = await fetch(`/api/googleSheets?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to update data: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating sheet data:', error);
        throw error;
    }
}

/**
 * Clears data from Google Sheets
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The range to clear (e.g., 'Inventory!A2:I2')
 * @returns {Promise<Object>} - The API response data
 */
export async function clearSheetData(spreadsheetId, range) {
    try {
        if (!isAuthenticated()) {
            throw new Error('User is not authenticated');
        }
        
        const token = await getAuthToken();

        const response = await fetch(`/api/googleSheets?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to clear data: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error clearing sheet data:', error);
        throw error;
    }
}

/**
 * Helper function to get a spreadsheet ID, either from environment or creating a new one
 * @returns {Promise<string>} - The spreadsheet ID
 */
export async function getSpreadsheetId() {
    try {
        if (!isAuthenticated()) {
            throw new Error('User is not authenticated');
        }
        
        const token = await getAuthToken();

        const response = await fetch('/api/spreadsheetId', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to get spreadsheet ID: ${response.status}`);
        }

        const data = await response.json();
        return data.spreadsheetId;
    } catch (error) {
        console.error('Error getting spreadsheet ID:', error);
        throw error;
    }
}

// Create a client object that matches what was expected in inventoryService.js
export const googleSheetsClient = {
    getData: fetchSheetData,
    updateData: updateSheetData,
    clearData: clearSheetData,
    getSpreadsheetId: getSpreadsheetId,
    isAuthenticated
};