// app/api/items/route.js
import { NextResponse } from 'next/server';
import { getItems, addItem } from '../../../utils/inventoryService';

// GET /api/items - Get all items
export async function GET(request) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const items = await getItems(accessToken);
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/items - Add a new item
export async function POST(request) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle multipart/form-data for image upload
        const formData = await request.formData();
        const imageFile = formData.get('image');

        // Extract item data from form
        const itemData = {};
        for (const [key, value] of formData.entries()) {
            if (key !== 'image') {
                // Handle numeric fields
                if (['price', 'costPrice', 'quantity', 'lowStockThreshold'].includes(key)) {
                    itemData[key] = value === '' ? 0 : Number(value);
                } else {
                    itemData[key] = value;
                }
            }
        }

        const newItem = await addItem(itemData, imageFile, accessToken);

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error('Error adding item:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}