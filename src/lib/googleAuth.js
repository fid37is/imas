// src/lib/googleAuth.js
import { google } from 'googleapis';

// Create JWT client using environment variables
export const createJwtClient = () => {
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
        jwtClient.authorize((err) => {
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