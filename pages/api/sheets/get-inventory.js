// pages/api/sheets/get-inventory.js
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user session to verify authentication
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(401).json({ error: 'You must be signed in' });
        }

        const { spreadsheetId, range } = req.query;

        if (!spreadsheetId || !range) {
            return res.status(400).json({ error: 'Spreadsheet ID and range are required' });
        }

        // Set up Google Sheets client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Use the access token from session
        oauth2Client.setCredentials({
            access_token: session.accessToken,
            refresh_token: session.refreshToken,
        });

        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        // Get inventory data from Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        // Process the data (convert from 2D array to objects with named properties)
        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.status(200).json({ items: [] });
        }

        const headers = rows[0];
        const items = rows.slice(1).map(row => {
            const item = {};
            headers.forEach((header, index) => {
                item[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
            });
            return item;
        });

        return res.status(200).json({ items });

    } catch (error) {
        console.error('Error fetching inventory from Google Sheets:', error);
        return res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
}