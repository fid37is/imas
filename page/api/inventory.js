// pages/api/inventory.js
import { getInventory, addItem, getInventoryStats, exportInventoryCsv } from "../../utils/inventoryService";

export default async function handler(req, res) {
    try {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        switch (req.method) {
            case 'GET':
                // Check if export flag is present
                if (req.query.export === 'csv') {
                    const csvData = await exportInventoryCsv();
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
                    return res.status(200).send(csvData);
                }

                // Check if stats flag is present
                if (req.query.stats === 'true') {
                    const stats = await getInventoryStats();
                    return res.status(200).json(stats);
                }

                // Default: return all inventory
                const inventory = await getInventory();
                return res.status(200).json(inventory);

            case 'POST':
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