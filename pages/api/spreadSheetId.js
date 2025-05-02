// pages/api/spreadsheetId.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getSpreadsheetId } from '../../utils/googleSheetsService';

export default async function handler(req, res) {
    try {
        // Get user session to retrieve access token
        const session = await getServerSession(req, res, authOptions);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get spreadsheet ID using the access token
        const spreadsheetId = await getSpreadsheetId(session.accessToken);

        return res.status(200).json({ spreadsheetId });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}