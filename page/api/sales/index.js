// pages/api/sales/index.js
import { getSales } from "../../../utils/inventoryService";

export default async function handler(req, res) {
    try {
        // Only allow GET method
        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        // Extract date range from query parameters if provided
        const { startDate, endDate } = req.query;

        // Get sales data with optional date filtering
        const sales = await getSales(startDate, endDate);

        // Calculate summary statistics
        const totalSales = sales.reduce((sum, sale) => sum + sale.saleAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
        const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

        return res.status(200).json({
            sales,
            summary: {
                totalSales,
                totalProfit,
                totalQuantity,
                transactionCount: sales.length
            }
        });
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