// app/api/items/[id]/route.js
import { NextResponse } from 'next/server';
import { getItems, updateItem, deleteItem } from '../../../../utils/inventoryService';

// GET /api/items/:id - Get a specific item
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const items = await getItems(accessToken);
        const item = items.find(item => item.id === id);

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/items/:id - Update an item
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // For multipart/form-data we need to handle differently
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

        // Ensure ID matches the URL parameter
        itemData.id = id;

        // Handle checkbox for image deletion (stringified boolean)
        if (itemData.deleteImage === 'true') {
            itemData.deleteImage = true;
        }

        const updatedItem = await updateItem(itemData, imageFile, accessToken);

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/items/:id - Delete an item
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the item to find the image ID
        const items = await getItems(accessToken);
        const item = items.find(item => item.id === id);

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Delete the item and its image
        await deleteItem(id, item.imageId, accessToken);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}