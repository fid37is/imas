// app/api/orders/update-status/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../../sheets/utils';

export async function PUT(request) {
    try {
        const { orderId, status } = await request.json();

        if (!orderId || !status) {
            return NextResponse.json(
                { error: 'Missing required parameters: orderId or status' },
                { status: 400 }
            );
        }

        // Your Google Sheet ID - replace with your actual sheet ID
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        const SHEET_NAME = 'Orders'; // Adjust to your sheet tab name
        
        if (!SHEET_ID) {
            return NextResponse.json(
                { error: 'Google Sheet ID not configured' },
                { status: 500 }
            );
        }

        const sheets = await getSheetsClient();

        // Step 1: Get all data to find the row with the orderId
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A:Z`, // Adjust range as needed
        });

        const rows = getResponse.data.values || [];
        
        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'No data found in sheet' },
                { status: 404 }
            );
        }

        // Find the header row to identify column indices
        const headers = rows[0];
        const orderIdColumnIndex = headers.findIndex(header => 
            header.toLowerCase().replace(/\s+/g, '').includes('orderid')
        );
        const statusColumnIndex = headers.findIndex(header => 
            header.toLowerCase().includes('status')
        );

        if (orderIdColumnIndex === -1) {
            return NextResponse.json(
                { error: 'Order ID column not found in sheet' },
                { status: 400 }
            );
        }

        if (statusColumnIndex === -1) {
            return NextResponse.json(
                { error: 'Status column not found in sheet' },
                { status: 400 }
            );
        }

        // Find the row with the matching orderId
        const dataRows = rows.slice(1); // Skip header row
        const rowIndex = dataRows.findIndex(row => row[orderIdColumnIndex] === orderId);

        if (rowIndex === -1) {
            return NextResponse.json(
                { error: `Order with ID ${orderId} not found` },
                { status: 404 }
            );
        }

        // Calculate the actual row number (adding 2: 1 for header + 1 for 0-based index)
        const actualRowNumber = rowIndex + 2;
        
        // Convert column index to letter (A, B, C, etc.)
        const statusColumn = String.fromCharCode(65 + statusColumnIndex);
        const updateRange = `${SHEET_NAME}!${statusColumn}${actualRowNumber}`;

        // Step 2: Update the status
        const updateResponse = await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[status]],
            },
        });

        // Optional: Also update a "Last Updated" column if it exists
        const lastUpdatedColumnIndex = headers.findIndex(header => 
            header.toLowerCase().includes('updated') || header.toLowerCase().includes('modified')
        );
        
        if (lastUpdatedColumnIndex !== -1) {
            const lastUpdatedColumn = String.fromCharCode(65 + lastUpdatedColumnIndex);
            const lastUpdatedRange = `${SHEET_NAME}!${lastUpdatedColumn}${actualRowNumber}`;
            
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: lastUpdatedRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[new Date().toISOString()]],
                },
            });
        }

        return NextResponse.json({
            success: true,
            orderId,
            status,
            updatedCells: updateResponse.data.updatedCells,
            updatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        return NextResponse.json(
            { 
                error: 'Failed to update order status',
                details: error.message 
            },
            { status: 500 }
        );
    }
}