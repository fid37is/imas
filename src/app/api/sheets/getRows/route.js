// /src/app/api/sheets/getRows/route.

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Get Google Sheets client with credentials
async function getSheetsClient() {
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
        return NextResponse.json({ error: 'Failed to initialize Google Sheets client' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sheetId = searchParams.get('sheetId');
        const range = searchParams.get('range');

        if (!sheetId || !range) {
            return NextResponse.json({ error: 'Missing sheetId or range parameters' }, { status: 400 });
        }

        const sheets = await getSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });

        const rows = response.data.values || [];
        return NextResponse.json({ rows }, { status: 200 });

    } catch (error) {
        console.error('Error in GET /api/sheets/getRows:', error);
        return NextResponse.json({ error: 'Failed to fetch data from Google Sheets' }, { status: 500 });
    }
}