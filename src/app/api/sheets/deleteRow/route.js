// app/api/sheets/delete/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../utils';

export async function DELETE(request) {
    try {
        const { sheetId, sheetName, rowIndex } = await request.json();

        if (!sheetId || !sheetName || !rowIndex) {
            return NextResponse.json(
                { error: 'Missing required parameters: sheetId, sheetName, or rowIndex' },
                { status: 400 }
            );
        }

        const sheets = await getSheetsClient();

        // First, get the spreadsheet to find the sheetId
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });

        // Find the sheet with the given name
        const sheet = spreadsheet.data.sheets.find(s =>
            s.properties.title === sheetName
        );

        if (!sheet) {
            return NextResponse.json(
                { error: `Sheet "${sheetName}" not found` },
                { status: 404 }
            );
        }

        // Delete the row
        const deleteRequest = {
            spreadsheetId: sheetId,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex - 1, // 0-indexed
                                endIndex: rowIndex // exclusive
                            }
                        }
                    }
                ]
            }
        };

        await sheets.spreadsheets.batchUpdate(deleteRequest);

        return NextResponse.json({
            result: {
                success: true
            }
        });
    } catch (error) {
        console.error('Error in DELETE /api/sheets/delete:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}