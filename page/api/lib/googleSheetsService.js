// pages/api/lib/googleSheetsService.js
import { google } from "googleapis";

// Create a JWT auth client using environment variables
export const createJwtClient = () => {
    try {
        const credentials = {
            client_email: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Replace escaped newlines
        };

        if (!credentials.client_email || !credentials.private_key) {
            throw new Error("Google API credentials are missing");
        }

        return new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        );
    } catch (error) {
        console.error("Error creating JWT client:", error);
        throw error;
    }
};

// Google Sheets ID from environment variable
export const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID;

// Initialize Google Sheets API
export const getSheets = () => {
    try {
        const jwtClient = createJwtClient();
        return google.sheets({ version: "v4", auth: jwtClient });
    } catch (error) {
        console.error("Error initializing Google Sheets API:", error);
        throw error;
    }
};

// Initialize Google Drive API
export const getDrive = () => {
    try {
        const jwtClient = createJwtClient();
        return google.drive({ version: "v3", auth: jwtClient });
    } catch (error) {
        console.error("Error initializing Google Drive API:", error);
        throw error;
    }
};

// Helper function to authorize JWT client
export const authorizeJwtClient = async () => {
    try {
        const jwtClient = createJwtClient();
        await jwtClient.authorize();
        return jwtClient;
    } catch (error) {
        console.error("Error authorizing JWT client:", error);
        throw error;
    }
};

// Helper function to get a range of data from a Google Sheet
export const getSheetData = async (range) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        return response.data.values || [];
    } catch (error) {
        console.error(`Error getting sheet data from range ${range}:`, error);
        throw error;
    }
};

// Helper function to append data to a Google Sheet
export const appendSheetData = async (range, values) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: values
            }
        });

        return response.data;
    } catch (error) {
        console.error(`Error appending data to range ${range}:`, error);
        throw error;
    }
};

// Helper function to update data in a Google Sheet
export const updateSheetData = async (range, values) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: values
            }
        });

        return response.data;
    } catch (error) {
        console.error(`Error updating data in range ${range}:`, error);
        throw error;
    }
};

// Helper function to delete a row from a Google Sheet
export const deleteSheetRow = async (sheetId, rowIndex) => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();

        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: "ROWS",
                                startIndex: rowIndex - 1, // 0-indexed for the API
                                endIndex: rowIndex // exclusive
                            }
                        }
                    }
                ]
            }
        });

        return response.data;
    } catch (error) {
        console.error(`Error deleting row ${rowIndex} from sheet ${sheetId}:`, error);
        throw error;
    }
};