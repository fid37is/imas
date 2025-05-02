import { google } from 'googleapis';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { spreadsheetId, range } = req.query;

        if (!spreadsheetId || !range) {
            return res.status(400).json({ error: 'Missing spreadsheetId or range' });
        }

        const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching Google Sheet data:', error);
        res.status(500).json({ error: 'Failed to fetch sheet data' });
    }
}
