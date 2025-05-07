// src/lib/googleSheetsService.js
import { authorizeJwtClient, getSheets } from './googleAuth';

// Add row to Google Sheet
export const addRowToSheet = async (sheetId, range, values) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values]
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error adding row to sheet:', error);
        throw error;
    }
};

// Get rows from Google Sheet
// Get rows from Google Sheet
export const getRowsFromSheet = async (sheetId, range) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range
        });

        return response.data.values || [];
    } catch (error) {
        console.error('Error getting rows from sheet:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error);
        }
        throw new Error('Failed to get rows from Google Sheet');
    }
};


// Update row in Google Sheet
export const updateRowInSheet = async (sheetId, range, values) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values]
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error updating row in sheet:', error);
        throw error;
    }
};