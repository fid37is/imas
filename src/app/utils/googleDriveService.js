/* eslint-disable @typescript-eslint/no-unused-vars */
// pages/api/lib/googleSheetsService.js
import { google } from 'googleapis';

// Create JWT client using environment variables
const createJwtClient = () => {
    const client = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        // Replace new lines in the private key
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
    );

    return client;
};

// Keep an authorized client instance for reuse
let jwtClient = null;

// Authorization function
export const authorizeJwtClient = async () => {
    if (!jwtClient) {
        jwtClient = createJwtClient();
    }

    return new Promise((resolve, reject) => {
        jwtClient.authorize((err, tokens) => {
            if (err) {
                console.error('JWT Authorization failed:', err);
                reject(err);
                return;
            }
            resolve(jwtClient);
        });
    });
};

// Get Google Sheets instance
export const getSheets = () => {
    return google.sheets({ version: 'v4', auth: jwtClient });
};

// Get Google Drive instance
export const getDrive = () => {
    return google.drive({ version: 'v3', auth: jwtClient });
};

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
        console.error('Error getting rows from sheet:', error);
        throw error;
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