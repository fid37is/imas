// app/api/orders/update-status/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../../sheets/utils';

export async function PUT(request) {
    try {
        const { orderId, status, trackingNumber } = await request.json();

        // Validate required parameters
        if (!orderId || !status) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Missing required parameters: orderId or status' 
                },
                { status: 400 }
            );
        }

        // Validate status values
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status.toLowerCase())) {
            return NextResponse.json(
                { 
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
                },
                { status: 400 }
            );
        }

        // Your Google Sheet ID - replace with your actual sheet ID
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        const SHEET_NAME = 'Orders'; // Adjust to your sheet tab name
        
        if (!SHEET_ID) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Google Sheet ID not configured in environment variables' 
                },
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
                { 
                    success: false,
                    error: 'No data found in sheet' 
                },
                { status: 404 }
            );
        }

        // Find the header row to identify column indices
        const headers = rows[0];
        
        // Find column indices (case-insensitive and flexible matching)
        const orderIdColumnIndex = headers.findIndex(header => 
            header.toLowerCase().replace(/\s+/g, '').includes('orderid') ||
            header.toLowerCase().replace(/\s+/g, '').includes('id')
        );
        
        const statusColumnIndex = headers.findIndex(header => 
            header.toLowerCase().includes('status')
        );
        
        const trackingColumnIndex = headers.findIndex(header => 
            header.toLowerCase().includes('tracking') ||
            header.toLowerCase().includes('track')
        );
        
        const lastUpdatedColumnIndex = headers.findIndex(header => 
            header.toLowerCase().includes('updated') || 
            header.toLowerCase().includes('modified') ||
            header.toLowerCase().includes('lastupdated')
        );

        // Validate required columns exist
        if (orderIdColumnIndex === -1) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Order ID column not found in sheet. Expected column containing "orderid" or "id"' 
                },
                { status: 400 }
            );
        }

        if (statusColumnIndex === -1) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Status column not found in sheet. Expected column containing "status"' 
                },
                { status: 400 }
            );
        }

        // Find the row with the matching orderId
        const dataRows = rows.slice(1); // Skip header row
        const rowIndex = dataRows.findIndex(row => 
            row[orderIdColumnIndex] && row[orderIdColumnIndex].toString() === orderId.toString()
        );

        if (rowIndex === -1) {
            return NextResponse.json(
                { 
                    success: false,
                    error: `Order with ID ${orderId} not found in sheet` 
                },
                { status: 404 }
            );
        }

        // Calculate the actual row number (adding 2: 1 for header + 1 for 0-based index)
        const actualRowNumber = rowIndex + 2;
        
        // Prepare batch update data
        const updateData = [];
        const updateInfo = {
            orderId,
            status,
            updatedAt: new Date().toISOString(),
            updatedColumns: []
        };

        // Convert column index to letter (A, B, C, etc.)
        const getColumnLetter = (index) => {
            let letter = '';
            while (index >= 0) {
                letter = String.fromCharCode((index % 26) + 65) + letter;
                index = Math.floor(index / 26) - 1;
            }
            return letter;
        };

        // Update status (required)
        const statusColumn = getColumnLetter(statusColumnIndex);
        const statusRange = `${SHEET_NAME}!${statusColumn}${actualRowNumber}`;
        updateData.push({
            range: statusRange,
            values: [[status]]
        });
        updateInfo.updatedColumns.push('status');

        // Update tracking number if provided and column exists
        if (trackingNumber && trackingColumnIndex !== -1) {
            const trackingColumn = getColumnLetter(trackingColumnIndex);
            const trackingRange = `${SHEET_NAME}!${trackingColumn}${actualRowNumber}`;
            updateData.push({
                range: trackingRange,
                values: [[trackingNumber]]
            });
            updateInfo.trackingNumber = trackingNumber;
            updateInfo.updatedColumns.push('tracking');
        }

        // Update last updated timestamp if column exists
        if (lastUpdatedColumnIndex !== -1) {
            const lastUpdatedColumn = getColumnLetter(lastUpdatedColumnIndex);
            const lastUpdatedRange = `${SHEET_NAME}!${lastUpdatedColumn}${actualRowNumber}`;
            updateData.push({
                range: lastUpdatedRange,
                values: [[new Date().toISOString()]]
            });
            updateInfo.updatedColumns.push('lastUpdated');
        }

        // Perform batch update
        const batchUpdateResponse = await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SHEET_ID,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: updateData
            }
        });

        // Log successful update
        console.log(`Order ${orderId} status updated to ${status}`, {
            rowNumber: actualRowNumber,
            updatedColumns: updateInfo.updatedColumns,
            updatedCells: batchUpdateResponse.data.totalUpdatedCells
        });

        return NextResponse.json({
            success: true,
            ...updateInfo,
            updatedCells: batchUpdateResponse.data.totalUpdatedCells,
            message: `Order ${orderId} successfully updated`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        
        // Return detailed error information for debugging
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to update order status',
                details: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

// Optional: Add GET method to check order status
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json(
                { error: 'Missing orderId parameter' },
                { status: 400 }
            );
        }

        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        const SHEET_NAME = 'Orders';
        
        if (!SHEET_ID) {
            return NextResponse.json(
                { error: 'Google Sheet ID not configured' },
                { status: 500 }
            );
        }

        const sheets = await getSheetsClient();

        // Get all data
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A:Z`,
        });

        const rows = getResponse.data.values || [];
        
        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'No data found in sheet' },
                { status: 404 }
            );
        }

        const headers = rows[0];
        const orderIdColumnIndex = headers.findIndex(header => 
            header.toLowerCase().replace(/\s+/g, '').includes('orderid')
        );
        const statusColumnIndex = headers.findIndex(header => 
            header.toLowerCase().includes('status')
        );

        if (orderIdColumnIndex === -1 || statusColumnIndex === -1) {
            return NextResponse.json(
                { error: 'Required columns not found' },
                { status: 400 }
            );
        }

        const dataRows = rows.slice(1);
        const orderRow = dataRows.find(row => row[orderIdColumnIndex] === orderId);

        if (!orderRow) {
            return NextResponse.json(
                { error: `Order ${orderId} not found` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            orderId,
            status: orderRow[statusColumnIndex] || 'pending',
            found: true
        });

    } catch (error) {
        console.error('Error fetching order status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order status' },
            { status: 500 }
        );
    }
}