// app/api/sales/route.js
import { NextResponse } from 'next/server';
import { recordSale } from '../../../utils/inventoryService';
import { getSalesRecords } from '../../../utils/googleSheetsService';

// GET /api/sales - Get sales records
export async function GET(request) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Extract date range from query parameters
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const sales = await getSalesRecords(accessToken, startDate, endDate);
        return NextResponse.json(sales);
    } catch (error) {
        console.error('Error fetching sales:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/sales - Record a new sale
export async function POST(request) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // Validate required fields
        if (!data.itemId || !data.quantity || !data.price) {
            return NextResponse.json(
                { error: 'Item ID, quantity, and price are required' },
                { status: 400 }
            );
        }

        const sale = await recordSale(data, accessToken);

        return NextResponse.json(sale, { status: 201 });
    } catch (error) {
        console.error('Error recording sale:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}