import { google } from 'googleapis';

let jwtClient = null;

// Create a JWT client either from full base64 credentials or individual vars
const createJwtClient = () => {
    if (process.env.GOOGLE_CREDENTIALS_B64) {
        // Use full credentials from base64-encoded JSON (for Vercel)
        const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8');
        const credentials = JSON.parse(decoded);

        return new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
        );
    } else {
        // Use individual .env.local vars (for local dev)
        return new google.auth.JWT(
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
            null,
            (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
        );
    }
};

// Authorize client
export const authorizeJwtClient = async () => {
    if (!jwtClient) jwtClient = createJwtClient();

    return new Promise((resolve, reject) => {
        jwtClient.authorize((err) => {
            if (err) {
                console.error('JWT Authorization failed:', err);
                reject(err);
            } else {
                resolve(jwtClient);
            }
        });
    });
};

// Reusable sheets and drive clients
export const getSheets = () => google.sheets({ version: 'v4', auth: jwtClient });
export const getDrive = () => google.drive({ version: 'v3', auth: jwtClient });

// Sheet operations
export const addRowToSheet = async (sheetId, range, values) => {
    await authorizeJwtClient();
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [values] }
    });
    return res.data;
};

export const getRowsFromSheet = async (sheetId, range) => {
    await authorizeJwtClient();
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    return res.data.values || [];
};

export const updateRowInSheet = async (sheetId, range, values) => {
    await authorizeJwtClient();
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [values] }
    });
    return res.data;
};