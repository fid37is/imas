// app/api/sheets/updateRow/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../utils';

export async function PUT(request) {
    try {
        const { sheetId, range, values } = await request.json();

        if (!sheetId || !range || !values) {
            return NextResponse.json(
                { error: 'Missing required parameters: sheetId, range, or values' },
                { status: 400 }
            );
        }

        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        return NextResponse.json({
            result: {
                success: true,
                updatedCells: response.data.updatedCells
            }
        });
    } catch (error) {
        console.error('Error in updateRow API route:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}