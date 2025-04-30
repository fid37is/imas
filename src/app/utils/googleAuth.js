// src/utils/googleAuth.js
import { google } from 'googleapis';

/**
 * Initializes and returns an authenticated Google API client
 * @returns {Object} Google Auth client
 */
export const getGoogleAuth = () => {
    try {
        // Parse service account key from environment variable
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

        // Create JWT client using service account credentials
        const auth = new google.auth.JWT(
            serviceAccountKey.client_email,
            null,
            serviceAccountKey.private_key,
            [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
        );

        return auth;
    } catch (error) {
        console.error('Error initializing Google Auth:', error);
        throw new Error('Failed to initialize Google authentication');
    }
};

/**
 * Get Google Sheets API client
 * @returns {Object} Google Sheets API client
 */
export const getSheetsClient = async () => {
    const auth = getGoogleAuth();
    return google.sheets({ version: 'v4', auth });
};

/**
 * Get Google Drive API client
 * @returns {Object} Google Drive API client
 */
export const getDriveClient = async () => {
    const auth = getGoogleAuth();
    return google.drive({ version: 'v3', auth });
};