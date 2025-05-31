// app/api/orders/update-status/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../../sheets/utils';

export async function PUT(request) {
    try {
        const { orderId, status, trackingNumber } = await request.json();

        // Convert orderId to string for consistent comparison
        const orderIdStr = String(orderId).trim();
        console.log('Looking for orderId:', orderIdStr);

        // Validate required parameters
        if (!orderIdStr || !status) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required parameters: orderId or status'
                },
                { status: 400 }
            );
        }

        // ... existing validation code ...

        const sheets = await getSheetsClient();
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        const SHEET_NAME = 'Orders';

        // Get all data
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A:Z`,
        });

        const rows = getResponse.data.values || [];
        console.log('Total rows found:', rows.length);

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No data found in sheet' },
                { status: 404 }
            );
        }

        const headers = rows[0];
        console.log('Headers:', headers);

        // More robust header matching
        const orderIdColumnIndex = headers.findIndex(header => {
            if (!header) return false;
            const headerLower = String(header).toLowerCase().replace(/\s+/g, '');
            return headerLower.includes('orderid') ||
                headerLower.includes('order_id') ||
                (headerLower === 'id' && headers.length > 1); // Only match 'id' if not the only column
        });

        const statusColumnIndex = headers.findIndex(header =>
            header && String(header).toLowerCase().includes('status')
        );

        const trackingColumnIndex = headers.findIndex(header =>
            header && (String(header).toLowerCase().includes('tracking') ||
                String(header).toLowerCase().includes('track'))
        );

        const lastUpdatedColumnIndex = headers.findIndex(header =>
            header && (String(header).toLowerCase().includes('updated') ||
                String(header).toLowerCase().includes('modified') ||
                String(header).toLowerCase().includes('lastupdated'))
        );

        console.log('Column indices:', {
            orderId: orderIdColumnIndex,
            status: statusColumnIndex,
            tracking: trackingColumnIndex,
            lastUpdated: lastUpdatedColumnIndex
        });

        // Validate required columns
        if (orderIdColumnIndex === -1) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Order ID column not found in sheet',
                    availableHeaders: headers
                },
                { status: 400 }
            );
        }

        if (statusColumnIndex === -1) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Status column not found in sheet',
                    availableHeaders: headers
                },
                { status: 400 }
            );
        }

        // More robust row finding
        const dataRows = rows.slice(1);
        console.log('Searching through', dataRows.length, 'data rows');

        const rowIndex = dataRows.findIndex(row => {
            if (!row || !row[orderIdColumnIndex]) return false;
            const cellValue = String(row[orderIdColumnIndex]).trim();
            console.log('Comparing:', cellValue, '===', orderIdStr);
            return cellValue === orderIdStr;
        });

        if (rowIndex === -1) {
            // Log all order IDs for debugging
            const existingOrderIds = dataRows
                .map((row, idx) => ({
                    row: idx + 2,
                    orderId: row[orderIdColumnIndex] ? String(row[orderIdColumnIndex]).trim() : 'EMPTY'
                }))
                .slice(0, 10); // First 10 for debugging

            console.log('Existing order IDs (first 10):', existingOrderIds);

            return NextResponse.json(
                {
                    success: false,
                    error: `Order with ID ${orderIdStr} not found in sheet`,
                    searchedFor: orderIdStr,
                    existingOrderIds: existingOrderIds
                },
                { status: 404 }
            );
        }

        const actualRowNumber = rowIndex + 2;
        console.log('Found order at row:', actualRowNumber);

        // Enhanced getColumnLetter with validation
        const getColumnLetter = (index) => {
            if (index < 0) {
                throw new Error(`Invalid column index: ${index}`);
            }

            let letter = '';
            let num = index;

            while (num >= 0) {
                letter = String.fromCharCode((num % 26) + 65) + letter;
                num = Math.floor(num / 26) - 1;
            }

            console.log(`Column index ${index} -> Letter ${letter}`);
            return letter;
        };

        // Prepare batch update with validation
        const updateData = [];
        const updateInfo = {
            orderId: orderIdStr,
            status,
            updatedAt: new Date().toISOString(),
            updatedColumns: []
        };

        try {
            // Update status (required)
            const statusColumn = getColumnLetter(statusColumnIndex);
            const statusRange = `${SHEET_NAME}!${statusColumn}${actualRowNumber}`;
            updateData.push({
                range: statusRange,
                values: [[status]]
            });
            updateInfo.updatedColumns.push('status');
            console.log('Status update range:', statusRange);

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
                console.log('Tracking update range:', trackingRange);
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
                console.log('LastUpdated range:', lastUpdatedRange);
            }

            console.log('Batch update data:', JSON.stringify(updateData, null, 2));

            // Perform batch update
            const batchUpdateResponse = await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updateData
                }
            });

            console.log('Batch update successful:', batchUpdateResponse.data);

            return NextResponse.json({
                success: true,
                ...updateInfo,
                updatedCells: batchUpdateResponse.data.totalUpdatedCells,
                message: `Order ${orderIdStr} successfully updated`
            });

        } catch (columnError) {
            console.error('Column processing error:', columnError);
            throw new Error(`Column processing failed: ${columnError.message}`);
        }

    } catch (error) {
        console.error('=== DETAILED ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // Check if it's a Google API error
        if (error.response) {
            console.error('API Error status:', error.response.status);
            console.error('API Error data:', JSON.stringify(error.response.data, null, 2));
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update order status',
                details: error.message,
                errorType: error.name,
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