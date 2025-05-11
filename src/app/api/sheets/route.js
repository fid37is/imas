import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Create JWT client - supports both base64 credentials and individual env vars
const createJwtClient = () => {
    try {
        if (process.env.GOOGLE_CREDENTIALS_B64) {
            // Use full credentials from base64-encoded JSON
            const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8');
            const credentials = JSON.parse(decoded);

            return new google.auth.JWT(
                credentials.client_email,
                null,
                credentials.private_key,
                ['https://www.googleapis.com/auth/spreadsheets']
            );
        } else {
            // Use individual environment variables (original implementation)
            const credentials = {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            };

            // Validate credentials to prevent undefined errors
            if (!credentials.client_email || !credentials.private_key) {
                throw new Error('Missing Google Sheets credentials');
            }

            return new google.auth.JWT(
                credentials.client_email,
                null,
                credentials.private_key,
                ['https://www.googleapis.com/auth/spreadsheets']
            );
        }
    } catch (error) {
        console.error('Error creating JWT client:', error);
        throw new Error('Failed to create authentication client: ' + error.message);
    }
};

// Get Google Sheets client with credentials
async function getSheetsClient() {
    try {
        const auth = createJwtClient();
        return google.sheets({ version: 'v4', auth });
    } catch (error) {
        console.error('Error initializing Google Sheets client:', error);
        throw new Error('Failed to initialize Google Sheets client');
    }
}

// Handle GET requests
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sheetId = searchParams.get('sheetId');
        const range = searchParams.get('range');

        // Validate required parameters
        if (!sheetId || !range) {
            return NextResponse.json({
                error: 'Missing required parameters: sheetId or range'
            }, { status: 400 });
        }

        // Initialize Google Sheets client
        const sheets = await getSheetsClient();

        // Get values from sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });

        // Ensure we have a valid response with data
        if (!response || !response.data) {
            console.error('Invalid response from Google Sheets API:', response);
            return NextResponse.json({ error: 'Invalid response from Google Sheets API' }, { status: 500 });
        }

        // Return rows (even if empty)
        const rows = response.data.values || [];
        return NextResponse.json({ rows }, { status: 200 });
    } catch (error) {
        console.error('Error in GET /api/sheets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Handle POST requests to add a row
export async function POST(request) {
    try {
        const { sheetId, range, values } = await request.json();

        // Validate required parameters
        if (!sheetId || !range || !values) {
            return NextResponse.json({
                error: 'Missing required parameters: sheetId, range, or values'
            }, { status: 400 });
        }

        // Initialize Google Sheets client
        const sheets = await getSheetsClient();

        // Append values to sheet
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        // Return success
        return NextResponse.json({
            result: {
                success: true,
                updatedRange: response.data.updates.updatedRange
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error in POST /api/sheets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Handle PUT requests to update a row
export async function PUT(request) {
    try {
        const { sheetId, range, values } = await request.json();

        // Validate required parameters
        if (!sheetId || !range || !values) {
            return NextResponse.json({
                error: 'Missing required parameters: sheetId, range, or values'
            }, { status: 400 });
        }

        // Initialize Google Sheets client
        const sheets = await getSheetsClient();

        // Update values in sheet
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        // Return success
        return NextResponse.json({
            result: {
                success: true,
                updatedCells: response.data.updatedCells
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error in PUT /api/sheets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}