// app/api/sheets/addRow/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../utils';

export async function POST(request) {
    try {
        const { sheetId, range, values } = await request.json();

        if (!sheetId || !range || !values) {
            return NextResponse.json(
                { error: 'Missing required parameters: sheetId, range, or values' },
                { status: 400 }
            );
        }

        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [values],
            },
        });

        return NextResponse.json({
            result: {
                success: true,
                updatedRows: response.data.updates?.updatedRows
            }
        });
    } catch (error) {
        console.error('Error in addRow API route:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}