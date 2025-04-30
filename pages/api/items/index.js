// pages/api/items/index.js
import { getInventoryItems, addInventoryItem } from '../../../src/utils/googleSheetsService';

export default async function handler(req, res) {
    // Set CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        // Handle GET request - Fetch all inventory items
        if (req.method === 'GET') {
            const items = await getInventoryItems();
            return res.status(200).json(items);
        }

        // Handle POST request - Add a new item
        if (req.method === 'POST') {
            const newItem = req.body;

            // Basic validation
            if (!newItem.name || !newItem.sku) {
                return res.status(400).json({ message: 'Name and SKU are required fields' });
            }

            // Add item to inventory
            const result = await addInventoryItem(newItem);
            return res.status(201).json(result);
        }

        // Handle OPTIONS request for CORS preflight
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Method not allowed
        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}