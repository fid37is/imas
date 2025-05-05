// src/app/api/sheets/getRows/route.js
import { NextResponse } from 'next/server';
import { getRowsFromSheet } from '../../../../lib/googleSheetsService';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sheetId = searchParams.get('sheetId');
        const range = searchParams.get('range');

        if (!sheetId || !range) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const rows = await getRowsFromSheet(sheetId, range);

        return NextResponse.json({ rows });
    } catch (error) {
        console.error('Error in get rows API route:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get rows from sheet' },
            { status: 500 }
        );
    }
}