// pages/api/items/index.js
import { getInventory, addItem } from "../../../utils/inventoryService";

export default async function handler(req, res) {
    try {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        switch (req.method) {
            case 'GET':
                // Get all inventory items
                const inventory = await getInventory();
                return res.status(200).json(inventory);

            case 'POST':
                // Create a new inventory item
                const newItem = await addItem(req.body);
                return res.status(201).json(newItem);

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('API error:', error);

        // Determine status code based on error
        const statusCode = error.message === 'Authentication required' ? 401 : 500;

        return res.status(statusCode).json({
            error: true,
            message: error.message || 'An unexpected error occurred'
        });
    }
}