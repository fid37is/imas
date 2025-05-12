// src/lib/googleAuth.js
import { google } from 'googleapis';

let jwtClient = null;

export const authorizeJwtClient = async () => {
    if (!jwtClient) {
        const isBase64 = !!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;

        let credentials;

        try {
            if (isBase64) {
                // ✅ Decode base64 env (Vercel)
                const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
                credentials = JSON.parse(json);
            } else {
                // ✅ Use .env.local (Dev)
                credentials = {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                };
            }

            jwtClient = new google.auth.JWT(
                credentials.client_email,
                null,
                credentials.private_key,
                [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive',
                ]
            );
        } catch (error) {
            console.error('❌ Failed to initialize Google Sheets client:', error);
            throw new Error('Failed to initialize Google Sheets client');
        }
    }

    return new Promise((resolve, reject) => {
        jwtClient.authorize((err) => {
            if (err) {
                console.error('❌ JWT Authorization failed:', err);
                reject(err);
                return;
            }
            resolve(jwtClient);
        });
    });
};

export const getSheets = () => {
    return google.sheets({ version: 'v4', auth: jwtClient });
};

export const getDrive = () => {
    return google.drive({ version: 'v3', auth: jwtClient });
};
