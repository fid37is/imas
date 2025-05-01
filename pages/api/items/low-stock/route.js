// app/api/items/low-stock/route.js
import { NextResponse } from 'next/server';
import { getLowStock } from '../../../../utils/inventoryService';

// GET /api/items/low-stock - Get items with stock below threshold
export async function GET(request) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const items = await getLowStock(accessToken);
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}