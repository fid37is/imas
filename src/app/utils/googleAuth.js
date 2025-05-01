// src/utils/googleAuth.js
import { google } from 'googleapis';

/**
 * Initializes and returns an authenticated Google API client
 * @returns {Object} Google Auth client
 */
export const getGoogleAuth = () => {
    try {
        // For server-side authentication using a service account key
        // Make sure GOOGLE_SERVICE_ACCOUNT_KEY is properly set in your environment
        // It should be the entire JSON key file content, stringified
        let serviceAccountKey;
        
        try {
            // Attempt to parse the service account key from environment variable
            serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
            
            // Verify key has required properties
            if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
                throw new Error('Invalid service account key format');
            }
        } catch (parseError) {
            console.error('Error parsing Google service account key:', parseError);
            throw new Error('Invalid service account key format. Please check your GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
        }

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
        throw new Error(`Failed to initialize Google authentication: ${error.message}`);
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

/**
 * Helper function to test if Google auth is working
 * @returns {Promise<boolean>} Whether authentication was successful
 */
export const testGoogleAuth = async () => {
    try {
        const auth = getGoogleAuth();
        // Test authentication by getting a token
        await auth.authorize();
        return true;
    } catch (error) {
        console.error('Google Auth test failed:', error);
        return false;
    }
};