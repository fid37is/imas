// src/app/api/sheets/addRow/route.js
import { NextResponse } from 'next/server';
import { addRowToSheet } from '../../../../lib/googleSheetsService';

export async function POST(request) {
    try {
        const { sheetId, range, values } = await request.json();

        if (!sheetId || !range || !values) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const result = await addRowToSheet(sheetId, range, values);

        return NextResponse.json({ result });
    } catch (error) {
        console.error('Error in add row API route:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to add row to sheet' },
            { status: 500 }
        );
    }
}