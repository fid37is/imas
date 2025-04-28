import { google } from 'googleapis';
import { getAuth } from 'firebase/auth';

// Initialize Google APIs
const initGoogleApis = async () => {
    // Service account credentials should be stored securely in Firebase Functions
    const serviceAccount = require('../serviceAccountKey.json');
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const drive = google.drive({ version: 'v3', auth: client });

    return { sheets, drive };
};

// Fetch inventory from Google Sheets
export const fetchInventory = async () => {
    const { sheets } = await initGoogleApis();
    const spreadsheetId = process.env.NEXT_PUBLIC_INVENTORY_SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Inventory!A2:Z',
    });

    // Transform sheet data to objects
    return response.data.values.map(row => ({
        id: row[0],
        name: row[1],
        category: row[2],
        sku: row[3],
        price: parseFloat(row[4]),
        costPrice: parseFloat(row[5]),
        quantity: parseInt(row[6]),
        lowStockThreshold: parseInt(row[7]),
        imageUrl: row[8],
    }));
};