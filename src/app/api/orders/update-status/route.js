// app/api/orders/update-status/route.js
import { NextResponse } from 'next/server';
import { getSheetsClient } from '../../sheets/utils';

export async function PUT(request) {
    try {
        console.log('=== ORDERS STATUS UPDATE ===');
        const { orderId, status, trackingNumber } = await request.json();
        console.log('Updating order:', orderId, 'to status:', status);

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

        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        // IMPORTANT: Explicitly set to Orders sheet (not OrderItems)
        const ORDERS_SHEET_NAME = 'Orders';
        
        console.log('Fetching from Sheet ID:', SHEET_ID);
        console.log('Fetching from Sheet Name:', ORDERS_SHEET_NAME);
        
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

        // Fetch from Orders sheet (NOT OrderItems)
        console.log(`Fetching from range: ${ORDERS_SHEET_NAME}!A:Z`);
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${ORDERS_SHEET_NAME}!A:Z`,
        });

        const rows = getResponse.data.values || [];
        console.log('Total rows found in Orders sheet:', rows.length);
        
        if (rows.length === 0) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'No data found in Orders sheet' 
                },
                { status: 404 }
            );
        }

        // Find the header row to identify column indices
        const headers = rows[0];
        console.log('Headers in Orders sheet:', headers);
        
        // Find column indices
        const orderIdColumnIndex = headers.findIndex(header => 
            header && (
                header.toLowerCase().replace(/\s+/g, '').includes('orderid') ||
                header.toLowerCase().replace(/\s+/g, '').includes('id')
            )
        );
        
        // Status is explicitly in column D (index 3)
        const statusColumnIndex = 3; // Column D = index 3
        
        // Optional: find tracking column
        const trackingColumnIndex = headers.findIndex(header => 
            header && (
                header.toLowerCase().includes('tracking') ||
                header.toLowerCase().includes('track')
            )
        );
        
        // Optional: find last updated column
        const lastUpdatedColumnIndex = headers.findIndex(header => 
            header && (
                header.toLowerCase().includes('updated') || 
                header.toLowerCase().includes('modified')
            )
        );

        console.log('Column mapping:', {
            orderId: orderIdColumnIndex,
            status: statusColumnIndex, // Should be 3 (column D)
            tracking: trackingColumnIndex,
            lastUpdated: lastUpdatedColumnIndex
        });

        // Validate required columns exist
        if (orderIdColumnIndex === -1) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Order ID column not found in Orders sheet',
                    availableHeaders: headers
                },
                { status: 400 }
            );
        }

        // Find the row with the matching orderId
        const dataRows = rows.slice(1); // Skip header row
        const rowIndex = dataRows.findIndex(row => 
            row[orderIdColumnIndex] && 
            row[orderIdColumnIndex].toString().trim() === orderId.toString().trim()
        );

        if (rowIndex === -1) {
            console.log('Order not found. Available order IDs:', 
                dataRows.slice(0, 5).map(row => row[orderIdColumnIndex])
            );
            
            return NextResponse.json(
                { 
                    success: false,
                    error: `Order with ID ${orderId} not found in Orders sheet` 
                },
                { status: 404 }
            );
        }

        // Calculate the actual row number (adding 2: 1 for header + 1 for 0-based index)
        const actualRowNumber = rowIndex + 2;
        console.log('Found order at row:', actualRowNumber);

        // Convert column index to letter
        const getColumnLetter = (index) => {
            let letter = '';
            let num = index;
            while (num >= 0) {
                letter = String.fromCharCode((num % 26) + 65) + letter;
                num = Math.floor(num / 26) - 1;
            }
            return letter;
        };

        // Prepare batch update data
        const updateData = [];
        const updateInfo = {
            orderId,
            status,
            updatedAt: new Date().toISOString(),
            updatedColumns: []
        };

        // Update status in column D
        const statusRange = `${ORDERS_SHEET_NAME}!D${actualRowNumber}`;
        updateData.push({
            range: statusRange,
            values: [[status]]
        });
        updateInfo.updatedColumns.push('status');
        console.log('Status update range:', statusRange);

        // Update tracking number if provided and column exists
        if (trackingNumber && trackingColumnIndex !== -1) {
            const trackingColumn = getColumnLetter(trackingColumnIndex);
            const trackingRange = `${ORDERS_SHEET_NAME}!${trackingColumn}${actualRowNumber}`;
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
            const lastUpdatedRange = `${ORDERS_SHEET_NAME}!${lastUpdatedColumn}${actualRowNumber}`;
            updateData.push({
                range: lastUpdatedRange,
                values: [[new Date().toISOString()]]
            });
            updateInfo.updatedColumns.push('lastUpdated');
            console.log('LastUpdated range:', lastUpdatedRange);
        }

        console.log('Performing batch update with data:', updateData);

        // Perform batch update
        const batchUpdateResponse = await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SHEET_ID,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: updateData
            }
        });

        console.log('✅ Update successful:', batchUpdateResponse.data);

        return NextResponse.json({
            success: true,
            ...updateInfo,
            updatedCells: batchUpdateResponse.data.totalUpdatedCells,
            message: `Order ${orderId} status successfully updated to ${status}`
        });

    } catch (error) {
        console.error('❌ DETAILED ERROR:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            response: error.response?.data
        });
        
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