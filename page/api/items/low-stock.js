// pages/api/items/low-stock.js
import { getLowStockItems } from "../../../utils/inventoryService";

export default async function handler(req, res) {
    try {
        // Only allow GET method
        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        // Get all low stock items
        const lowStockItems = await getLowStockItems();
        return res.status(200).json(lowStockItems);
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