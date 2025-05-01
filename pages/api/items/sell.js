// pages/api/items/sell.js
import { getInventoryItems, recordItemSale } from '../../../src/app/utils/googleSheetsService';

export default async function handler(req, res) {
    // Set CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { itemId, quantity } = req.body;

        // Validate required fields
        if (!itemId || !quantity) {
            return res.status(400).json({ message: 'Item ID and quantity are required' });
        }

        // Validate quantity is positive number
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({ message: 'Quantity must be a positive number' });
        }

        // Get the item to be sold
        const allItems = await getInventoryItems();
        const item = allItems.find(item => item.id === itemId);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Check if enough quantity is available
        if (quantityNum > item.quantity) {
            return res.status(400).json({
                message: 'Not enough inventory',
                available: item.quantity
            });
        }

        // Record the sale
        await recordItemSale(item, quantityNum);

        // Get updated item data
        const updatedItems = await getInventoryItems();
        const updatedItem = updatedItems.find(i => i.id === itemId);

        return res.status(200).json({
            message: 'Sale recorded successfully',
            item: updatedItem,
            quantitySold: quantityNum,
            remaining: updatedItem.quantity
        });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}