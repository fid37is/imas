import { google } from 'googleapis';

// Initialize Google Sheets client with credentials
export async function getSheetsClient() {
    try {
        // Get credentials from environment variables
        const credentials = {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };

        // Create auth client
        const auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );

        // Return initialized sheets client
        return google.sheets({ version: 'v4', auth });
    } catch (error) {
        console.error('Error initializing Google Sheets client:', error);
        throw new Error('Failed to initialize Google Sheets client');
    }
}