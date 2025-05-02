// pages/api/googleSheets.js
import { getSheetsApi } from '../../src/app/utils/googleSheetsService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
    try {
        // Get user session to retrieve access token
        const session = await getServerSession(req, res, authOptions);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { spreadsheetId, range } = req.query;

        if (!spreadsheetId || !range) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Get sheets API client using the access token
        const sheets = await getSheetsApi(session.accessToken);

        if (req.method === 'GET') {
            // Fetch data from the specified spreadsheet and range
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            return res.status(200).json(response.data);
        }
        else if (req.method === 'POST') {
            // Update or append data
            const { valueInputOption = 'RAW', values, insertDataOption } = req.body;

            // If insertDataOption is provided, use append, otherwise use update
            if (insertDataOption) {
                const response = await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range,
                    valueInputOption,
                    insertDataOption,
                    resource: { values },
                });

                return res.status(200).json(response.data);
            } else {
                const response = await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range,
                    valueInputOption,
                    resource: { values },
                });

                return res.status(200).json(response.data);
            }
        }
        else if (req.method === 'DELETE') {
            // Clear values in the specified range
            const response = await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range,
            });

            return res.status(200).json(response.data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}