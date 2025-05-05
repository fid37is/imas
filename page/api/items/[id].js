// pages/api/items/[id].js
import { getInventory, updateItem, deleteItem, recordSale } from "../../../utils/inventoryService";

export default async function handler(req, res) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: true, message: 'Item ID is required' });
        }

        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        switch (req.method) {
            case 'GET':
                // Get a specific inventory item
                const inventory = await getInventory();
                const item = inventory.find(item => item.id === id);

                if (!item) {
                    return res.status(404).json({ error: true, message: 'Item not found' });
                }

                return res.status(200).json(item);

            case 'PUT':
                // Update an existing item
                const updatedItem = await updateItem({ id, ...req.body });
                return res.status(200).json(updatedItem);

            case 'DELETE':
                // Delete an item
                await deleteItem(id);
                return res.status(200).json({ success: true, message: 'Item deleted successfully' });

            case 'POST':
                // Handle special actions like recording a sale
                if (req.body.action === 'sell') {
                    // Get the current item first
                    const allItems = await getInventory();
                    const itemToSell = allItems.find(item => item.id === id);

                    if (!itemToSell) {
                        return res.status(404).json({ error: true, message: 'Item not found' });
                    }

                    // Record the sale
                    const quantity = req.body.quantity || 1;
                    const updatedInventoryItem = await recordSale(itemToSell, quantity);
                    return res.status(200).json(updatedInventoryItem);
                }

                return res.status(400).json({ error: true, message: 'Invalid action' });

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'POST']);
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