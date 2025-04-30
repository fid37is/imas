// pages/api/sheets/update-inventory.js
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user session to verify authentication
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(401).json({ error: 'You must be signed in' });
        }

        const { spreadsheetId, range, values } = req.body;

        if (!spreadsheetId || !range || !values) {
            return res.status(400).json({ error: 'Spreadsheet ID, range, and values are required' });
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

        // Update inventory data in Google Sheets
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values,
            },
        });

        return res.status(200).json({
            success: true,
            updatedCells: response.data.updatedCells,
            updatedRange: response.data.updatedRange,
        });

    } catch (error) {
        console.error('Error updating inventory in Google Sheets:', error);
        return res.status(500).json({ error: 'Failed to update inventory data' });
    }
}